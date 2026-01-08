/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolEventEmitter } from '@kbn/agent-builder-server';

import { DASHBOARD_EVENTS, type DashboardPanelAddedData } from '../../../../../common';
import type { BuildDashboardState } from '../state';

export interface EmitPanelNodeDeps {
  events: ToolEventEmitter;
}

export function createEmitPanelNode({ events }: EmitPanelNodeDeps) {
  return async (state: BuildDashboardState) => {
    const lastPanel = state.createdPanels[state.createdPanels.length - 1];

    if (lastPanel) {
      events.sendUiEvent<typeof DASHBOARD_EVENTS.PANEL_ADDED, DashboardPanelAddedData>(
        DASHBOARD_EVENTS.PANEL_ADDED,
        { panel: lastPanel }
      );
    }

    return {};
  };
}
