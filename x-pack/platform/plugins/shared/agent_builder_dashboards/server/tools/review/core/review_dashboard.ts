/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type {
  DashboardAttachmentData,
  AttachmentPanel,
} from '@kbn/agent-builder-dashboards-common';
import { isSection, DEFAULT_TIME_RANGE } from '@kbn/agent-builder-dashboards-common';
import { executeEsql, buildTimeRangeParams } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { hasStartEndParams } from '@kbn/esql-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getErrorMessage } from '../../generate/core';
import { resolveEsqlDataset } from '../../resolve_esql_dataset';
import type { PanelFacts } from './panel_facts';
import {
  extractPanelQuery,
  buildNoQueryPanelFacts,
  buildErrorPanelFacts,
  buildSuccessPanelFacts,
} from './panel_facts';
import type { JudgeResult } from './judge';
import { judgeDashboard } from './judge';

/** Per-query execution timeout in milliseconds. */
const QUERY_TIMEOUT_MS = 15_000;

/** Row cap applied to every panel query — the review only needs column stats and a sample. */
const QUERY_ROW_LIMIT = 1_000;

const resolveToIso = (value: string, roundUp: boolean): string => {
  const parsed = dateMath.parse(value, { roundUp });
  return parsed && parsed.isValid() ? parsed.toISOString() : value;
};

/**
 * Build a Query DSL range filter for the given time field and time range.
 * This mirrors the dashboard's source-level time filtering and complements any
 * `?_tstart`/`?_tend` named params used inside the ES|QL query.
 */
const buildRangeFilter = (
  timeField: string,
  timeRange: { from: string; to: string }
): QueryDslQueryContainer => ({
  range: {
    [timeField]: {
      gte: resolveToIso(timeRange.from, false),
      lte: resolveToIso(timeRange.to, true),
      format: 'strict_date_optional_time',
    },
  },
});

interface DashboardQueryContext {
  query: Query | undefined;
  filters: Filter[];
}

const getDashboardQueryContext = (
  dashboardData: DashboardAttachmentData,
  logger: Logger
): DashboardQueryContext => ({
  query: toStoredQuery(dashboardData.query as Parameters<typeof toStoredQuery>[0]),
  filters:
    toStoredFilters(dashboardData.filters as Parameters<typeof toStoredFilters>[0], logger) ?? [],
});

const ignoresDashboardQueryContext = (panel: AttachmentPanel, query: string): boolean => {
  if (panel.type !== LENS_EMBEDDABLE_TYPE) {
    return false;
  }

  const rootDataSource = panel.config.data_source as { query?: unknown } | undefined;
  if (rootDataSource?.query === query) {
    return panel.config.ignore_global_filters === true;
  }

  const layers = panel.config.layers as
    | Array<{ data_source?: { query?: unknown }; ignore_global_filters?: unknown }>
    | undefined;
  const queryLayer = layers?.find((layer) => layer.data_source?.query === query);
  return queryLayer?.ignore_global_filters === true;
};

const buildExecutionFilter = ({
  dashboardQueryContext,
  timeFilter,
  ignoreGlobalFilters,
}: {
  dashboardQueryContext: DashboardQueryContext;
  timeFilter: QueryDslQueryContainer | undefined;
  ignoreGlobalFilters: boolean;
}): QueryDslQueryContainer | undefined => {
  const { query, filters } = dashboardQueryContext;
  const { bool } = buildEsQuery(
    undefined,
    ignoreGlobalFilters ? [] : query ?? [],
    ignoreGlobalFilters ? [] : filters
  );
  const combinedFilter = timeFilter ? [...bool.filter, timeFilter] : bool.filter;

  if (
    combinedFilter.length === 0 &&
    bool.must.length === 0 &&
    bool.must_not.length === 0 &&
    bool.should.length === 0
  ) {
    return undefined;
  }

  return { bool: { ...bool, filter: combinedFilter } };
};

export interface ReviewDashboardParams {
  dashboardData: DashboardAttachmentData;
  /** Attachment version being reviewed — stamped on the result. */
  version: number;
  focus: string | undefined;
  esClient: IScopedClusterClient;
  modelProvider: ModelProvider;
  logger: Logger;
}

export interface ReviewDashboardResult {
  reviewed_version: number;
  time_range: { from: string; to: string };
  overall_assessment: string;
  findings: JudgeResult['findings'];
}

/** Flatten all panels from top-level and sections into a single list. */
const collectPanels = (dashboardData: DashboardAttachmentData): AttachmentPanel[] => {
  const panels: AttachmentPanel[] = [];
  for (const widget of dashboardData.panels) {
    if (isSection(widget)) {
      panels.push(...widget.panels);
    } else {
      panels.push(widget);
    }
  }
  return panels;
};

/**
 * Collect the title for a panel by looking for a title field on its config.
 * Lens and Vega configs may carry a top-level `title` string.
 */
const getPanelTitle = (panel: AttachmentPanel): string | undefined => {
  const title = (panel.config as { title?: unknown }).title;
  return typeof title === 'string' && title.length > 0 ? title : undefined;
};

/**
 * Execute a single panel's ES|QL query with the dashboard time range, with a
 * hard timeout. Returns a resolved PanelFacts regardless of outcome.
 *
 * Time filtering mirrors the two-mechanism approach Kibana uses in the dashboard:
 * named params fill `?_tstart`/`?_tend`, while a Query DSL range filter narrows
 * the source on the time field resolved from the query or its field capabilities.
 */
const executePanel = async (
  panel: AttachmentPanel,
  query: string,
  timeRange: { from: string; to: string },
  esClient: IScopedClusterClient,
  logger: Logger,
  dashboardQueryContext: DashboardQueryContext,
  projectRouting?: string
): Promise<PanelFacts> => {
  const title = getPanelTitle(panel);
  const start = Date.now();

  // Mirrors dashboard execution: named params + Query DSL range filter are always
  // applied independently. Named params fill ?_tstart/?_tend (e.g. in BUCKET or WHERE);
  // the range filter narrows the underlying scan to the time window on the time field.
  const params = hasStartEndParams(query) ? buildTimeRangeParams(timeRange) : undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const dataset = await resolveEsqlDataset(esClient, query, projectRouting);
    const timeFilter = dataset ? buildRangeFilter(dataset.timeField, timeRange) : undefined;
    const filter = buildExecutionFilter({
      dashboardQueryContext,
      timeFilter,
      ignoreGlobalFilters: ignoresDashboardQueryContext(panel, query),
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Query timed out after ${QUERY_TIMEOUT_MS}ms`)),
        QUERY_TIMEOUT_MS
      );
    });
    const result = await Promise.race([
      executeEsql({
        query,
        params,
        limit: QUERY_ROW_LIMIT,
        filter,
        esClient: esClient.asCurrentUser,
      }),
      timeoutPromise,
    ]);

    const duration = Date.now() - start;
    return buildSuccessPanelFacts(panel, title, query, result, duration);
  } catch (error) {
    const duration = Date.now() - start;
    const message = getErrorMessage(error);
    logger.debug(`Panel "${panel.id}" query failed: ${message}`);
    return buildErrorPanelFacts(panel, title, query, message, duration);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Environment-agnostic core of the review_dashboard tool.
 *
 * Reads the dashboard attachment data, re-executes every panel's ES|QL query
 * in parallel (using the dashboard's stored time range), computes per-panel
 * result facts, and calls the LLM judge with the full dashboard context.
 *
 * The Kibana-specific attachment resolution lives in the tool wrapper
 * (`review_dashboard_tool.ts`); this function receives the already-resolved
 * `DashboardAttachmentData` and is testable with faked deps.
 */
export const reviewDashboard = async ({
  dashboardData,
  version,
  focus,
  esClient,
  modelProvider,
  logger,
}: ReviewDashboardParams): Promise<ReviewDashboardResult> => {
  const timeRange = dashboardData.time_range ?? DEFAULT_TIME_RANGE;
  const panels = collectPanels(dashboardData);
  const dashboardQueryContext = getDashboardQueryContext(dashboardData, logger);

  logger.info(
    `Reviewing dashboard "${dashboardData.title}" (${
      panels.length
    } panels, time range: ${JSON.stringify(timeRange)})`
  );

  const panelFacts = await Promise.all(
    panels.map((panel) => {
      const query = extractPanelQuery(panel);
      if (!query) {
        const title = getPanelTitle(panel);
        return Promise.resolve(buildNoQueryPanelFacts(panel, title));
      }
      return executePanel(
        panel,
        query,
        timeRange,
        esClient,
        logger,
        dashboardQueryContext,
        dashboardData.project_routing
      );
    })
  );

  const { overall_assessment, findings } = await judgeDashboard({
    dashboardData,
    panelFacts,
    focus,
    modelProvider,
    logger,
  });

  return {
    reviewed_version: version,
    time_range: timeRange,
    overall_assessment,
    findings,
  };
};
