/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';

import { DASHBOARD_EVENTS, type DashboardFinalizedData } from '../../../../../common';
import { buildMarkdownPanel, getMarkdownPanelHeight, normalizePanels } from '../../../utils';
import type { BuildDashboardState } from '../state';
import type { FinalizeAction } from '../../types';

export interface FinalizeNodeDeps {
  logger: Logger;
  events: ToolEventEmitter;
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
}

export function createFinalizeNode({
  logger,
  events,
  dashboardLocator,
  spaces,
  request,
}: FinalizeNodeDeps) {
  return async (state: BuildDashboardState) => {
    let action: FinalizeAction;
    try {
      if (state.createdPanels.length === 0) {
        throw new Error('No panels were created for the dashboard');
      }

      const markdownPanel = buildMarkdownPanel(state.markdownContent);
      const yOffset = getMarkdownPanelHeight(state.markdownContent);
      const normalizedPanels = [markdownPanel, ...normalizePanels(state.createdPanels, yOffset)];

      const spaceId = spaces?.spacesService?.getSpaceId(request);

      const dashboardUrl = await dashboardLocator.getRedirectUrl(
        {
          panels: normalizedPanels,
          title: state.title,
          description: state.description,
          viewMode: 'edit',
          // TODO: Improve time range selection
          time_range: { from: 'now-15m', to: 'now' },
        },
        { spaceId }
      );

      events.sendUiEvent<typeof DASHBOARD_EVENTS.FINALIZED, DashboardFinalizedData>(
        DASHBOARD_EVENTS.FINALIZED,
        {
          url: dashboardUrl,
        }
      );

      action = {
        type: 'finalize',
        success: true,
        dashboardUrl,
      };

      return {
        dashboardUrl,
        actions: [action],
      };
    } catch (error) {
      logger.error(`Failed to finalize dashboard: ${error.message}`);
      action = {
        type: 'finalize',
        success: false,
        error: error.message,
      };
      return {
        error: error.message,
        actions: [action],
      };
    }
  };
}
