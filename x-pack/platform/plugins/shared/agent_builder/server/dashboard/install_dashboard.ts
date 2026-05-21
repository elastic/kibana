/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import overviewDashboard from './assets/overview-dashboard.json';
import {
  AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION,
  AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION,
  AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
} from './constants';
import chatcompleteAvgDurationMetricPanel from './assets/panels/chatcomplete-avg-duration-metric.json';
import chatcompleteCostOverTimePanel from './assets/panels/chatcomplete-cost-over-time.json';
import chatcompleteCountByModelBarPanel from './assets/panels/chatcomplete-count-by-model-bar.json';
import chatcompleteCountByModelOverTimePanel from './assets/panels/chatcomplete-count-by-model-over-time.json';
import chatcompleteCountByProviderBarPanel from './assets/panels/chatcomplete-count-by-provider-bar.json';
import chatcompleteLatencyByProviderOverTimePanel from './assets/panels/chatcomplete-latency-by-provider-over-time.json';
import chatcompleteTokenUsageOverTimePanel from './assets/panels/chatcomplete-token-usage-over-time.json';
import chatcompleteTotalCostMetricPanel from './assets/panels/chatcomplete-total-cost-metric.json';
import chatcompleteTotalCountMetricPanel from './assets/panels/chatcomplete-total-count-metric.json';
import chatcompleteTotalInputTokensMetricPanel from './assets/panels/chatcomplete-total-input-tokens-metric.json';
import chatcompleteTotalOutputTokensMetricPanel from './assets/panels/chatcomplete-total-output-tokens-metric.json';
import converseAvgDurationMetricPanel from './assets/panels/converse-avg-duration-metric.json';
import converseAvgDurationOverTimePanel from './assets/panels/converse-avg-duration-over-time.json';
import converseCountOverTimePanel from './assets/panels/converse-count-over-time.json';
import converseMaxDurationMetricPanel from './assets/panels/converse-max-duration-metric.json';
import converseP95DurationMetricPanel from './assets/panels/converse-p95-duration-metric.json';
import converseSpanCountMetricPanel from './assets/panels/converse-span-count-metric.json';
import executeAgentAvgDurationMetricPanel from './assets/panels/execute-agent-avg-duration-metric.json';
import executeAgentCountByAgentBarPanel from './assets/panels/execute-agent-count-by-agent-bar.json';
import executeAgentCountByAgentOverTimePanel from './assets/panels/execute-agent-count-by-agent-over-time.json';
import executeAgentCountMetricPanel from './assets/panels/execute-agent-count-metric.json';
import executeAgentDurationByAgentOverTimePanel from './assets/panels/execute-agent-duration-by-agent-over-time.json';
import executeAgentMaxDurationMetricPanel from './assets/panels/execute-agent-max-duration-metric.json';
import executeAgentP95DurationMetricPanel from './assets/panels/execute-agent-p95-duration-metric.json';
import toolAvgDurationMetricPanel from './assets/panels/tool-avg-duration-metric.json';
import toolCountByNameOverTimePanel from './assets/panels/tool-count-by-name-over-time.json';
import toolCountByStatusOverTimePanel from './assets/panels/tool-count-by-status-over-time.json';
import toolErrorCountMetricPanel from './assets/panels/tool-error-count-metric.json';
import toolSuccessRateMetricPanel from './assets/panels/tool-success-rate-metric.json';
import toolTop15ByNamePanel from './assets/panels/tool-top-15-by-name.json';
import toolTotalCountMetricPanel from './assets/panels/tool-total-count-metric.json';
import workflowAvgDurationMetricPanel from './assets/panels/workflow-avg-duration-metric.json';
import workflowAvgDurationOverTimePanel from './assets/panels/workflow-avg-duration-over-time.json';
import workflowCountByNameBarPanel from './assets/panels/workflow-count-by-name-bar.json';
import workflowCountByNameOverTimePanel from './assets/panels/workflow-count-by-name-over-time.json';
import workflowMaxDurationMetricPanel from './assets/panels/workflow-max-duration-metric.json';
import workflowP95DurationMetricPanel from './assets/panels/workflow-p95-duration-metric.json';
import workflowTotalCountMetricPanel from './assets/panels/workflow-total-count-metric.json';

interface DashboardGridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PanelTemplate {
  type: string;
  embeddableConfig: Record<string, unknown>;
}

interface SavedDashboardPanel {
  type: string;
  panelIndex: string;
  gridData: DashboardGridPosition & { i: string };
  embeddableConfig: Record<string, unknown>;
}

const PANELS: Record<string, PanelTemplate> = {
  'panels/chatcomplete-avg-duration-metric.json': chatcompleteAvgDurationMetricPanel,
  'panels/chatcomplete-cost-over-time.json': chatcompleteCostOverTimePanel,
  'panels/chatcomplete-count-by-model-bar.json': chatcompleteCountByModelBarPanel,
  'panels/chatcomplete-count-by-model-over-time.json': chatcompleteCountByModelOverTimePanel,
  'panels/chatcomplete-count-by-provider-bar.json': chatcompleteCountByProviderBarPanel,
  'panels/chatcomplete-latency-by-provider-over-time.json':
    chatcompleteLatencyByProviderOverTimePanel,
  'panels/chatcomplete-token-usage-over-time.json': chatcompleteTokenUsageOverTimePanel,
  'panels/chatcomplete-total-cost-metric.json': chatcompleteTotalCostMetricPanel,
  'panels/chatcomplete-total-count-metric.json': chatcompleteTotalCountMetricPanel,
  'panels/chatcomplete-total-input-tokens-metric.json': chatcompleteTotalInputTokensMetricPanel,
  'panels/chatcomplete-total-output-tokens-metric.json': chatcompleteTotalOutputTokensMetricPanel,
  'panels/converse-avg-duration-metric.json': converseAvgDurationMetricPanel,
  'panels/converse-avg-duration-over-time.json': converseAvgDurationOverTimePanel,
  'panels/converse-count-over-time.json': converseCountOverTimePanel,
  'panels/converse-max-duration-metric.json': converseMaxDurationMetricPanel,
  'panels/converse-p95-duration-metric.json': converseP95DurationMetricPanel,
  'panels/converse-span-count-metric.json': converseSpanCountMetricPanel,
  'panels/execute-agent-avg-duration-metric.json': executeAgentAvgDurationMetricPanel,
  'panels/execute-agent-count-by-agent-bar.json': executeAgentCountByAgentBarPanel,
  'panels/execute-agent-count-by-agent-over-time.json': executeAgentCountByAgentOverTimePanel,
  'panels/execute-agent-count-metric.json': executeAgentCountMetricPanel,
  'panels/execute-agent-duration-by-agent-over-time.json': executeAgentDurationByAgentOverTimePanel,
  'panels/execute-agent-max-duration-metric.json': executeAgentMaxDurationMetricPanel,
  'panels/execute-agent-p95-duration-metric.json': executeAgentP95DurationMetricPanel,
  'panels/tool-avg-duration-metric.json': toolAvgDurationMetricPanel,
  'panels/tool-count-by-name-over-time.json': toolCountByNameOverTimePanel,
  'panels/tool-count-by-status-over-time.json': toolCountByStatusOverTimePanel,
  'panels/tool-error-count-metric.json': toolErrorCountMetricPanel,
  'panels/tool-success-rate-metric.json': toolSuccessRateMetricPanel,
  'panels/tool-top-15-by-name.json': toolTop15ByNamePanel,
  'panels/tool-total-count-metric.json': toolTotalCountMetricPanel,
  'panels/workflow-avg-duration-metric.json': workflowAvgDurationMetricPanel,
  'panels/workflow-avg-duration-over-time.json': workflowAvgDurationOverTimePanel,
  'panels/workflow-count-by-name-bar.json': workflowCountByNameBarPanel,
  'panels/workflow-count-by-name-over-time.json': workflowCountByNameOverTimePanel,
  'panels/workflow-max-duration-metric.json': workflowMaxDurationMetricPanel,
  'panels/workflow-p95-duration-metric.json': workflowP95DurationMetricPanel,
  'panels/workflow-total-count-metric.json': workflowTotalCountMetricPanel,
};

export function buildOverviewDashboardPanels(): SavedDashboardPanel[] {
  const panels: SavedDashboardPanel[] = [];
  let globalY = 0;

  for (const section of overviewDashboard.sections) {
    const headerId = uuidv4();
    panels.push({
      type: 'markdown',
      panelIndex: headerId,
      gridData: { x: 0, y: globalY, w: 48, h: 2, i: headerId },
      embeddableConfig: { content: `**${section.title}**` },
    });
    globalY += 2;

    let sectionMaxY = 0;
    for (const { $ref, grid } of section.panels) {
      const template = PANELS[$ref];
      if (!template) {
        throw new Error(`Unknown panel ref: ${$ref}`);
      }

      const panelIndex = uuidv4();
      const absoluteY = globalY + grid.y;
      panels.push({
        type: template.type,
        panelIndex,
        gridData: { x: grid.x, y: absoluteY, w: grid.w, h: grid.h, i: panelIndex },
        embeddableConfig: template.embeddableConfig,
      });
      sectionMaxY = Math.max(sectionMaxY, grid.y + grid.h);
    }

    globalY += sectionMaxY + 1;
  }

  return panels;
}

/**
 * Creates or overwrites the plugin-owned managed Agent Builder overview dashboard.
 * Idempotent: uses a stable id with overwrite. Re-run on startup upgrades the dashboard
 * when {@link AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION} increases.
 */
export const installAgentBuilderDashboard = async (
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<void> => {
  if (
    overviewDashboard.definition_version !== AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION
  ) {
    throw new Error(
      `overview-dashboard.json definition_version (${overviewDashboard.definition_version}) must match AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION (${AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION})`
    );
  }

  logger.debug(
    `Installing Agent Builder overview dashboard (${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}, definition v${AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION})...`
  );

  await savedObjectsClient.create(
    'dashboard',
    {
      description: overviewDashboard.description,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' } }),
      },
      optionsJSON: JSON.stringify({
        hidePanelTitles: overviewDashboard.options.hide_panel_titles,
        hidePanelBorders: false,
        useMargins: overviewDashboard.options.use_margins,
        autoApplyFilters: overviewDashboard.options.auto_apply_filters,
        syncColors: false,
        syncCursor: overviewDashboard.options.sync_cursor,
        syncTooltips: false,
      }),
      panelsJSON: JSON.stringify(buildOverviewDashboardPanels()),
      timeRestore: false,
      title: `[Elastic] ${overviewDashboard.title}`,
      version: AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
    },
    {
      id: AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
      references: [],
      overwrite: true,
      managed: true,
      initialNamespaces: ['*'],
      coreMigrationVersion: AGENT_BUILDER_DASHBOARD_CORE_MIGRATION_VERSION,
      typeMigrationVersion: AGENT_BUILDER_DASHBOARD_TYPE_MIGRATION_VERSION,
      refresh: false,
    }
  );

  logger.debug('Agent Builder overview dashboard installed');
};
