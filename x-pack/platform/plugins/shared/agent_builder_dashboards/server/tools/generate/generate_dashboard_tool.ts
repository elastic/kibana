/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import {
  createControlFieldCapabilitiesResolver,
  executeDashboardUpsert,
  getErrorMessage,
  hasValidNewDashboardMetadata,
  upsertDashboardSchema,
} from '@kbn/dashboard-authoring';
import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { normalizeLegacyVegaPanels } from './legacy_vega_panels';
import { createAttachmentPanelResolver } from './resolvers/attachment_panel_resolver';
import { createPanelResolver } from './resolvers/panel_resolver';
import { createDashboardValidator } from './dashboard_validator';
import { createLayoutArranger } from './layout_arranger';
import { persistDashboardResult, toErrorResult } from './dashboard_result';

const newDashboardMetadataErrorMessage =
  'New dashboards require `set.title` with a non-empty title.';

const generateDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
    ),
  ...upsertDashboardSchema.shape,
});

export interface GenerateDashboardToolDeps {
  getDashboardStateSchema: () => Promise<
    ReturnType<DashboardPluginStart['getDashboardStateSchema']>
  >;
}

/**
 * Kibana dashboard generation tool. Wraps the environment-agnostic {@link executeDashboardUpsert}
 * core with the conversation attachment store, the Kibana panel resolvers, and a dedicated layout
 * call that arranges the resulting grid, then persists the result as a dashboard attachment.
 */
export const generateDashboardTool = ({
  getDashboardStateSchema,
}: GenerateDashboardToolDeps): BuiltinSkillBoundedTool<typeof generateDashboardSchema> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Create or update a dashboard by describing the desired changes, keyed by id.

Persists the resulting dashboard as an attachment and returns its id plus a compact summary (not the full payload). Reference the returned attachment id to render the dashboard; do not copy the payload into follow-up tool calls.

- \`set\`: dashboard title, description, and time range.
- \`sections\`: sections to create or rename.
- \`panels\`: panels to create, edit, replace, or move between sections, by id. Panel content is generated from a natural-language query (\`source: "request"\`; pick the engine with "renderer": Lens (default), Vega, or custom content for HTML-based layouts that Lens and Vega cannot express), authored by value (\`source: "config"\`: markdown or ML anomaly panels), or taken from an existing visualization attachment (\`source: "attachment"\`).
- \`controls\`: interactive filters pinned above the dashboard (dropdown, range slider, or time slider).
- \`remove\`: ids of panels, sections, or controls to remove.
- \`layout\`: the user's layout instructions, if any.

Panel positions and sizes are arranged automatically after the changes are applied.`,
    schema: generateDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, ...upsert },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        if (isNewDashboard && !hasValidNewDashboardMetadata(upsert)) {
          logger.error(newDashboardMetadataErrorMessage);
          return toErrorResult(newDashboardMetadataErrorMessage);
        }

        const { dashboardData, failures, panelAuthoringNotes } = await executeDashboardUpsert({
          dashboardData: latestVersion && normalizeLegacyVegaPanels(latestVersion.data),
          upsert,
          logger,
          resolvePanelContent: createPanelResolver({
            logger,
            modelProvider,
            events,
            esClient,
          }),
          resolveAttachmentPanel: createAttachmentPanelResolver({ attachments }),
          resolveControlFieldCapabilities: createControlFieldCapabilitiesResolver({
            esClient: esClient.asCurrentUser,
          }),
          validateDashboard: createDashboardValidator(await getDashboardStateSchema()),
          arrangeLayout: createLayoutArranger({ modelProvider }),
        });

        return await persistDashboardResult({
          dashboardAttachmentId: previousAttachmentId ?? uuidv4(),
          isNewDashboard,
          dashboardData,
          failures,
          panelAuthoringNotes,
          context: { attachments, events, esClient, logger },
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return toErrorResult(`Failed to generate dashboard: ${errorMessage}`, {
          dashboardAttachmentId: previousAttachmentId,
        });
      }
    },
  };
};
