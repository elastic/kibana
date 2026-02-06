/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { isToolResultId } from '@kbn/agent-builder-server';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import { dashboardTools, DASHBOARD_EVENTS, type DashboardPanelAddedData } from '../../../common';
import { checkDashboardToolsAvailability, buildLensConfig } from '../utils';

const addPanelSchema = z.object({
  panel: z
    .unknown()
    .describe('Panel config (visualization) or tool_result_id from createVisualization'),
});

export const addPanelTool = (): BuiltinToolDefinition<typeof addPanelSchema> => {
  return {
    id: dashboardTools.addPanel,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Add a visualization panel to the dashboard preview.

Pass either:
- A tool_result_id from a previous createVisualization call (preferred)
- A full visualization config object

The panel will appear in the live dashboard preview immediately.`,
    schema: addPanelSchema,
    tags: [],
    handler: async ({ panel }, { events, resultStore }) => {
      // Resolve panel config from tool_result_id if needed
      let panelConfig = panel;

      if (typeof panel === 'string' && isToolResultId(panel)) {
        if (!resultStore || !resultStore.has(panel)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Panel reference "${panel}" was not found. Make sure to pass a valid tool_result_id from createVisualization.`,
                },
              },
            ],
          };
        }

        const result = resultStore.get(panel);
        if (result.type !== ToolResultType.visualization) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Provided tool_result_id "${panel}" is not a visualization result (got "${result.type}").`,
                },
              },
            ],
          };
        }

        panelConfig = result.data.visualization;
      }

      // Normalize the panel config to proper Lens attributes
      const normalizedPanel = buildLensConfig(panelConfig as LensApiSchemaType);

      // Emit custom event - UI will call DashboardApi.addNewPanel()
      events.sendUiEvent<typeof DASHBOARD_EVENTS.PANEL_ADDED, DashboardPanelAddedData>(
        DASHBOARD_EVENTS.PANEL_ADDED,
        { panel: normalizedPanel }
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: 'Panel added to dashboard preview.',
            },
          },
        ],
      };
    },
  };
};
