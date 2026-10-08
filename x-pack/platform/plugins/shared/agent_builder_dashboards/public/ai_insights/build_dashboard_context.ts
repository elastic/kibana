/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  apiHasType,
  apiPublishesDataViews,
  apiPublishesEsql,
  apiPublishesTitle,
  getTitle,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import type {
  AiInsightsDashboardContext,
  AiInsightsDataSource,
  AiInsightsPanelSummary,
} from '../../common/ai_insights/types';
import { AI_INSIGHTS_EMBEDDABLE_TYPE } from '../../common/ai_insights/constants';

interface SerializedPanelLike {
  id?: string;
  type?: string;
  config?: {
    title?: string;
    attributes?: {
      title?: string;
    };
  };
  panels?: SerializedPanelLike[];
}

interface DashboardLikeParent {
  children$: PublishingSubject<Record<string, unknown>>;
  dataViews$?: PublishingSubject<DataView[] | undefined>;
  getSerializedState: () => {
    attributes?: {
      title?: string;
      description?: string;
      panels?: SerializedPanelLike[];
    };
  };
}

export function isDashboardLikeParent(api: unknown): api is DashboardLikeParent {
  return (
    typeof api === 'object' &&
    api !== null &&
    'children$' in api &&
    'getSerializedState' in api &&
    typeof (api as DashboardLikeParent).getSerializedState === 'function'
  );
}

function flattenSerializedPanels(
  widgets: SerializedPanelLike[] | undefined
): SerializedPanelLike[] {
  if (!widgets?.length) {
    return [];
  }
  const panels: SerializedPanelLike[] = [];
  for (const widget of widgets) {
    if (widget.panels) {
      panels.push(...flattenSerializedPanels(widget.panels));
    } else {
      panels.push(widget);
    }
  }
  return panels;
}

function readSerializedTitle(panel: SerializedPanelLike | undefined): string | undefined {
  if (!panel?.config) {
    return undefined;
  }
  if (typeof panel.config.title === 'string' && panel.config.title.trim()) {
    return panel.config.title;
  }
  if (typeof panel.config.attributes?.title === 'string' && panel.config.attributes.title.trim()) {
    return panel.config.attributes.title;
  }
  return undefined;
}

function readTitle(child: unknown, fallback: string): string {
  if (apiPublishesTitle(child)) {
    return getTitle(child) || fallback;
  }
  return fallback;
}

function readEsql(child: unknown): string | undefined {
  if (!apiPublishesEsql(child)) {
    return undefined;
  }
  const queries = child.esql$.getValue();
  const first = queries?.[0];
  if (first && 'esql' in first && typeof first.esql === 'string') {
    return first.esql;
  }
  return undefined;
}

function toDataSource(dataView: DataView): AiInsightsDataSource | undefined {
  const indexPattern = dataView.getIndexPattern?.() || dataView.title;
  if (!indexPattern) {
    return undefined;
  }
  return {
    id: dataView.id,
    title: dataView.getName?.() || dataView.name || indexPattern,
    index_pattern: indexPattern,
    time_field: dataView.timeFieldName,
  };
}

/** Best-effort index patterns from ES|QL so ES|QL-only dashboards still get metric prefetch. */
export function extractEsqlIndexPatterns(esql: string): string[] {
  const match = esql.match(/\bFROM\s+(.+?)(?:\s*\||\s+METADATA\b|$)/i);
  if (!match?.[1]) {
    return [];
  }
  return match[1]
    .split(',')
    .map((part) =>
      part
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/^\[|\]$/g, '')
    )
    .filter((part) => part.length > 0 && !part.includes('$'));
}

function collectDataSources(
  parentApi: DashboardLikeParent,
  panels: AiInsightsPanelSummary[]
): AiInsightsDataSource[] {
  const byPattern = new Map<string, AiInsightsDataSource>();

  const addSource = (source: AiInsightsDataSource) => {
    if (!byPattern.has(source.index_pattern)) {
      byPattern.set(source.index_pattern, source);
    }
  };

  const addDataViews = (dataViews: DataView[] | undefined) => {
    for (const dataView of dataViews ?? []) {
      const source = toDataSource(dataView);
      if (source) {
        addSource(source);
      }
    }
  };

  if (apiPublishesDataViews(parentApi)) {
    addDataViews(parentApi.dataViews$.getValue());
  }

  for (const child of Object.values(parentApi.children$.getValue())) {
    if (apiPublishesDataViews(child)) {
      addDataViews(child.dataViews$.getValue());
    }
  }

  // Fallback for panels that expose ES|QL but not data views yet.
  for (const panel of panels) {
    if (!panel.esql) {
      continue;
    }
    for (const indexPattern of extractEsqlIndexPatterns(panel.esql)) {
      addSource({
        title: panel.title || indexPattern,
        index_pattern: indexPattern,
      });
    }
  }

  return Array.from(byPattern.values());
}

export function buildDashboardContext(
  parentApi: unknown,
  selfUuid: string
): AiInsightsDashboardContext {
  if (!isDashboardLikeParent(parentApi)) {
    return {
      title: '',
      description: '',
      panels: [],
      data_sources: [],
    };
  }

  const attributes = parentApi.getSerializedState().attributes ?? {};
  const serializedPanels = flattenSerializedPanels(attributes.panels);
  const serializedById = new Map(
    serializedPanels
      .filter(
        (panel): panel is SerializedPanelLike & { id: string } => typeof panel.id === 'string'
      )
      .map((panel) => [panel.id, panel])
  );

  const children = parentApi.children$.getValue();
  const panels: AiInsightsPanelSummary[] = [];
  const seenIds = new Set<string>();

  for (const [id, child] of Object.entries(children)) {
    if (id === selfUuid) {
      continue;
    }

    const type = apiHasType(child) ? child.type : serializedById.get(id)?.type || 'unknown';
    if (type === AI_INSIGHTS_EMBEDDABLE_TYPE) {
      continue;
    }

    seenIds.add(id);
    const esql = readEsql(child);
    panels.push({
      id,
      title: readTitle(child, readSerializedTitle(serializedById.get(id)) || id),
      type,
      ...(esql ? { esql } : {}),
    });
  }

  // Include serialized panels that are not yet mounted as children (e.g. offscreen).
  for (const panel of serializedPanels) {
    const id = panel.id;
    if (!id || seenIds.has(id) || id === selfUuid) {
      continue;
    }
    if (panel.type === AI_INSIGHTS_EMBEDDABLE_TYPE) {
      continue;
    }
    panels.push({
      id,
      title: readSerializedTitle(panel) || id,
      type: panel.type || 'unknown',
    });
  }

  return {
    title: attributes.title ?? '',
    description: attributes.description ?? '',
    panels,
    data_sources: collectDataSources(parentApi, panels),
  };
}

export function summarizeFilters(filters: Filter[] | undefined): string | undefined {
  if (!filters?.length) {
    return undefined;
  }
  try {
    return JSON.stringify(
      filters.map((filter) => ({
        meta: filter.meta,
        query: filter.query,
      }))
    );
  } catch {
    return `${filters.length} filters`;
  }
}

export function summarizeQuery(query: Query | AggregateQuery | undefined): string | undefined {
  if (!query) {
    return undefined;
  }
  if ('esql' in query) {
    return query.esql;
  }
  if ('query' in query) {
    return typeof query.query === 'string' ? query.query : JSON.stringify(query.query);
  }
  return undefined;
}
