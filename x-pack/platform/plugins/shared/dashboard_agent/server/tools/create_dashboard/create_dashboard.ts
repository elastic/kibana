/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server';
import type { DashboardPluginStart, DashboardPanel } from '@kbn/dashboard-plugin/server';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '@kbn/dashboard-plugin/common/constants';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard to create.'),
  description: z.string().describe('A description of the dashboard.'),
  panels: z
    .array(z.unknown())
    .optional()
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact).'),
});

export const createDashboardTool = (
  dashboard: DashboardPluginStart,
  savedObjects: SavedObjectsServiceStart,
  {
    dashboardLocator,
    spaces,
  }: { dashboardLocator: DashboardAppLocator; spaces?: SpacesPluginStart }
): BuiltinToolDefinition<typeof createDashboardSchema> => {
  return {
    id: dashboardTools.createDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Create a dashboard with the specified title, description, and panels.

This tool will:
1. Accept a title and description for the dashboard
2. Accept an array of panel configurations
3. Create a dashboard with the provided configuration`,
    schema: createDashboardSchema,
    tags: [],
    handler: async ({ title, description, panels, ...rest }, { logger, request, esClient }) => {
      try {
        const dashboardsClient = dashboard.client;

        const coreContext = {
          savedObjects: { client: savedObjects.getScopedClient(request) },
        };

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve(coreContext),
          resolve: async () => ({ core: coreContext }),
        } as unknown as RequestHandlerContext;

        const normalizedPanels = normalizePanels(panels);

        const dashboardCreateResponse = await dashboardsClient.create(requestHandlerContext, {
          data: { title, description, panels: normalizedPanels },
        });

        logger.info(`Dashboard created successfully: ${dashboardCreateResponse.id}`);

        const spaceId = spaces?.spacesService?.getSpaceId(request);
        const dashboardUrl = await dashboardLocator?.getRedirectUrl(
          { dashboardId: dashboardCreateResponse.id },
          { spaceId }
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                id: dashboardCreateResponse.id,
                title,
                content: {
                  url: dashboardUrl,
                  description,
                  panelCount: normalizedPanels.length,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in create_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create dashboard: ${error.message}`,
                metadata: { title, description },
              },
            },
          ],
        };
      }
    },
  };
};

// this is a temporary function to normalize the panels to the correct format
const normalizePanels = (panels: unknown[] | undefined): DashboardPanel[] => {
  return (panels ?? []).map((panel, index) => {
    return buildLensPanelFromApi(panel as LensApiSchemaType, index);
  });
};

const buildLensPanelFromApi = (config: LensApiSchemaType, index: number): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title: lensAttributes.title ?? config.title ?? 'Generated panel',
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid: createDefaultGrid(index),
    config: lensConfig,
  };
};

const createDefaultGrid = (
  index: number,
  existing?: DashboardPanel['grid']
): DashboardPanel['grid'] => {
  const yOffset = index * DEFAULT_PANEL_HEIGHT;
  return {
    x: existing?.x ?? 0,
    y: existing?.y ?? yOffset,
    w: existing?.w ?? DEFAULT_PANEL_WIDTH,
    h: existing?.h ?? DEFAULT_PANEL_HEIGHT,
  };
};
