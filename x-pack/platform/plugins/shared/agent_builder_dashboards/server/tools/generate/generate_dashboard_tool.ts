/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  type SupportedChartType,
} from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';

import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import {
  createVisPanelResolver,
  executeDashboardOperations,
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
} from './core';
import { getPanelQuerySource, type PanelQuerySource } from './core/lens_config';
import type { NormalizePanelChange, NormalizePanelSkipped } from './core/operations/types';
import type { PanelFailure } from './core/utils';
import { applyDefaultDashboardTimeRange } from './time_range';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const generateDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
    ),
  operations: z.array(dashboardOperationSchema).min(1),
});

interface DashboardPanelSummary {
  id: string;
  key?: string;
  title?: string;
  chart_type: string;
  source: PanelQuerySource;
  hide_title?: boolean;
  grid: AttachmentPanel['grid'];
  authoring_note?: string;
  warnings?: string[];
}

interface DashboardSectionSummary {
  id: string;
  title: string;
  collapsed: boolean;
  grid: DashboardSection['grid'];
  panels: DashboardPanelSummary[];
}

interface DashboardSummary {
  title: string;
  description?: string;
  panels: Array<DashboardPanelSummary | DashboardSectionSummary>;
  controls: Array<{ id?: string; type?: string; title?: string }>;
}

interface GenerateDashboardResultData {
  attachment_id: string;
  version: number;
  dashboard: DashboardSummary;
  failures?: PanelFailure[];
  changes?: NormalizePanelChange[];
  skipped?: NormalizePanelSkipped[];
}

const findPanelKey = (panelId: string, panelKeys: Map<string, string>): string | undefined => {
  for (const [key, id] of panelKeys) {
    if (id === panelId) {
      return key;
    }
  }
  return undefined;
};

const summarizePanel = (
  panel: AttachmentPanel,
  authoringNotesByPanelId: Map<string, string>,
  panelKeys: Map<string, string>
): DashboardPanelSummary => {
  const config = panel.config;
  const title = typeof config.title === 'string' ? config.title : undefined;
  const chartType = typeof config.type === 'string' ? config.type : panel.type;
  const hideTitle = typeof config.hide_title === 'boolean' ? config.hide_title : undefined;
  const key = findPanelKey(panel.id, panelKeys);

  return {
    id: panel.id,
    ...(key !== undefined ? { key } : {}),
    title,
    chart_type: chartType,
    source: getPanelQuerySource(panel.type, config),
    ...(hideTitle !== undefined ? { hide_title: hideTitle } : {}),
    grid: panel.grid,
    authoring_note: authoringNotesByPanelId.get(panel.id),
  };
};

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
 *
 * `authoringNotesByPanelId` holds the one-sentence note describing every chart
 * authored in this run, keyed by panel id. Panels that were not authored now
 * (or whose engine returned no note) simply have no `authoring_note`.
 */
const summarizeDashboard = (
  dashboardData: DashboardAttachmentData,
  authoringNotesByPanelId: Map<string, string>,
  panelKeys: Map<string, string>
): DashboardSummary => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map((panel) =>
          summarizePanel(panel, authoringNotesByPanelId, panelKeys)
        ),
      };
    }
    return summarizePanel(widget, authoringNotesByPanelId, panelKeys);
  }),
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardOperations} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, and a compact dashboard summary.
 *
 * This keeps the heavy payload out of the LLM transcript — the model references
 * the attachment id to render it rather than copying it into the next tool call.
 */
export const generateDashboardTool = ({
  compileAllowList,
}: {
  compileAllowList?: SupportedChartType[];
} = {}): BuiltinSkillBoundedTool<typeof generateDashboardSchema> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Generate or update a dashboard from ordered operations.

Persists the resulting dashboard as an attachment and returns its id plus a compact summary (not the full payload). Reference the returned attachment id to render the dashboard; do not copy the payload into follow-up tool calls.

Use operations[] to:
1. set metadata
2. add panels (resolved panel configs, or Lens/Vega visualizations from a natural-language query — pick the engine with the panel "renderer" field; defaults to Lens)
3. edit existing Lens, Vega, or markdown panel content
4. update panel layouts without changing content
5. add / remove sections, including inline section panels during add_section
6. remove panels
7. add / remove controls (interactive filters pinned above the dashboard: dropdown, range slider, or time slider)
8. add / edit custom content panels (\`source: "config"\`, \`type: "custom_content"\`) for HTML-based layouts that Lens and Vega cannot express
9. normalize existing Lens panels (house-style defects or a full restyle)`,
    schema: generateDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, operations },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        if (isNewDashboard && !hasValidCreateMetadataOperations(operations)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();

        const {
          dashboardData,
          failures,
          panelAuthoringNotes,
          touchedRequestPanelData,
          panelKeys,
          normalizeChanges,
          normalizeSkipped,
        } = await executeDashboardOperations({
          dashboardData: latestVersion?.data,
          operations,
          logger,
          resolvePanelContent: createVisPanelResolver({
            logger,
            modelProvider,
            events,
            esClient,
            compileAllowList,
          }),
          resolveCustomContentTemplate: createCustomContentTemplateResolver({
            logger,
            modelProvider,
            esClient,
          }),
        });

        const finalDashboardData = touchedRequestPanelData
          ? await applyDefaultDashboardTimeRange({
              dashboardData,
              esClient,
              logger,
            })
          : dashboardData;

        const description = `Dashboard: ${finalDashboardData.title}`;
        const attachment = isNewDashboard
          ? await attachments.add({
              id: dashboardAttachmentId,
              type: DASHBOARD_ATTACHMENT_TYPE,
              description,
              data: finalDashboardData,
            })
          : await attachments.update(dashboardAttachmentId, {
              data: finalDashboardData,
              description,
            });

        if (!attachment) {
          throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
        }

        logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

        const ranNormalize = operations.some(
          (operation) => operation.operation === 'normalize_panels'
        );

        const data: GenerateDashboardResultData = {
          attachment_id: attachment.id,
          version: attachment.current_version ?? 1,
          dashboard: summarizeDashboard(
            finalDashboardData,
            new Map(
              panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
            ),
            panelKeys
          ),
          failures: failures.length > 0 ? failures : undefined,
          ...(ranNormalize ? { changes: normalizeChanges, skipped: normalizeSkipped } : {}),
        };

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data,
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dashboard: ${errorMessage}`,
                metadata: { dashboardAttachmentId: previousAttachmentId, operations },
              },
            },
          ],
        };
      }
    },
  };
};

const missingNewDashboardMetadataErrorResult = {
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: newDashboardMetadataErrorMessage,
      },
    },
  ],
};
