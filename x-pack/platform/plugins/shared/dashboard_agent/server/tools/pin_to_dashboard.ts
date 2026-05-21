/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import { DASHBOARD_PINNED_UI_EVENT } from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../common';

const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';
const AI_SUMMARY_PANEL_TYPE = 'ai_summary_panel';

const pinToDashboardSchema = z.object({
  title: z.string().describe('Title for the new dashboard.'),
  prompt: z
    .string()
    .describe(
      'The prompt describing what the AI summary panel should analyze and display. Be specific about the data context and the insights you want.'
    ),
  connectorId: z.string().describe('The AI connector ID to use for generating the summary.'),
  esqlQuery: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query whose results will be passed as data context to the AI when generating the summary.'
    ),
});

export const pinToDashboardTool = (): BuiltinToolDefinition<typeof pinToDashboardSchema> => ({
  id: dashboardTools.pinToDashboard,
  type: ToolType.builtin,
  tags: [],
  description: `Create a new Kibana dashboard containing an AI-powered summary panel.

The panel stores the prompt and ES|QL query (not generated HTML), regenerates its AI-written summary on every dashboard load using streaming LLM output, and displays the result as readable prose.

Use this tool when the user wants to:
- Save an AI analysis to a shareable dashboard
- Create a persistent AI-generated insight panel from a conversation
- Pin a data summary to a dashboard for others to view

The tool returns the ID of the newly created dashboard.`,
  schema: pinToDashboardSchema,
  handler: async ({ title, prompt, connectorId, esqlQuery }, context) => {
    const panelIndex = uuidv4();

    const panel = {
      type: AI_SUMMARY_PANEL_TYPE,
      panelIndex,
      embeddableConfig: {
        prompt,
        connectorId,
        content: '',
        ...(esqlQuery ? { esqlQuery } : {}),
      },
      gridData: { x: 0, y: 0, w: 48, h: 15, i: panelIndex },
    };

    const attributes = {
      title,
      description: '',
      panelsJSON: JSON.stringify([panel]),
      optionsJSON: JSON.stringify({ useMargins: true, hidePanelTitles: false }),
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
      },
    };

    const saved = await context.savedObjectsClient.create(DASHBOARD_SAVED_OBJECT_TYPE, attributes);

    context.events.sendUiEvent(DASHBOARD_PINNED_UI_EVENT, {
      dashboardId: saved.id,
      title,
    });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            dashboardId: saved.id,
            title,
            message: `Dashboard "${title}" created successfully with an AI summary panel.`,
          },
        },
      ],
    };
  },
});
