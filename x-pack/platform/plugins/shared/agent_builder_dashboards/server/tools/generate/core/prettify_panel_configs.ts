/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  getChartTypeFromLensConfig,
  getEsqlQueriesFromLensConfig,
  getPrettifyConfigInstructions,
} from '@kbn/agent-builder-visualizations-server';
import { indexPanelsById, updatePanelInDashboard } from './dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from './failure_types';
import type { ResolvePanelContent } from './operations/panels';
import type { PanelAuthoringNote } from './resolve_panel';
import type { PanelFailure } from './utils';

const prettifyNlQuery =
  'Bring this existing visualization in line with the configuration rules stated in this prompt, preserving its analysis intent, chart type, and ES|QL query.';

interface PrettifyRequest {
  panelId: string;
  panel: AttachmentPanel;
  chartType: SupportedChartType;
  esql: string;
}

const toPrettifyRequest = (
  panelId: string,
  panel: AttachmentPanel
): PrettifyRequest | undefined => {
  if (panel.type !== LENS_EMBEDDABLE_TYPE) {
    return undefined;
  }

  const chartType = getChartTypeFromLensConfig(panel.config);
  if (!chartType) {
    return undefined;
  }

  const queries = getEsqlQueriesFromLensConfig(panel.config);
  if (queries.length !== 1) {
    return undefined;
  }

  return { panelId, panel, chartType, esql: queries[0] };
};

export const prettifyPanelConfigs = async ({
  dashboardData,
  existingPanels,
  resolvePanelContent,
  skipPanelIds = new Set(),
}: {
  dashboardData: DashboardAttachmentData;
  existingPanels: readonly AttachmentPanel[];
  resolvePanelContent: ResolvePanelContent;
  skipPanelIds?: ReadonlySet<string>;
}): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: PanelFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
}> => {
  const currentPanelIndex = indexPanelsById(dashboardData.panels);
  const failures: PanelFailure[] = [];
  const panelAuthoringNotes: PanelAuthoringNote[] = [];
  const requests: PrettifyRequest[] = [];

  for (const existingPanel of existingPanels) {
    if (skipPanelIds.has(existingPanel.id)) {
      continue;
    }

    const currentPanel = currentPanelIndex.get(existingPanel.id);
    if (!currentPanel) {
      continue;
    }

    const request = toPrettifyRequest(existingPanel.id, currentPanel);
    if (!request) {
      continue;
    }

    requests.push(request);
  }

  const attempts = await Promise.all(
    requests.map(async ({ panelId, panel, chartType, esql }) => ({
      panelId,
      attempt: await resolvePanelContent({
        type: 'vis',
        operationType: DASHBOARD_OPERATION_FAILURE_TYPES.prettifyPanelConfigs,
        identifier: panelId,
        nlQuery: prettifyNlQuery,
        chartType,
        esql,
        additionalChartConfigInstructions: getPrettifyConfigInstructions(chartType),
        existingPanel: panel,
      }),
    }))
  );

  let nextDashboardData = dashboardData;
  for (const { panelId, attempt } of attempts) {
    if (attempt.type === 'failure') {
      failures.push(attempt.failure);
      continue;
    }

    const updateResult = updatePanelInDashboard({
      dashboardData: nextDashboardData,
      panelId,
      transformPanel: (panel) => ({ ...panel, ...attempt.panelContent }),
    });
    nextDashboardData = updateResult.dashboardData;

    if (attempt.authoringNote) {
      panelAuthoringNotes.push({
        panelId,
        authoringNote: attempt.authoringNote,
      });
    }
  }

  return { dashboardData: nextDashboardData, failures, panelAuthoringNotes };
};
