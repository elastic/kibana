/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_PANEL_TRIGGER,
  ADD_CANVAS_ELEMENT_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { ACTION_VISUALIZE_GEO_FIELD } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { FILTER_BY_MAP_EXTENT } from './filter_by_map_extent/constants';
import { SYNCHRONIZE_MOVEMENT_ACTION } from './synchronize_movement/constants';
import type { MapsPluginStartDependencies } from '../plugin';

export function registerUiActions(core: CoreStart, plugins: MapsPluginStartDependencies) {
  if (core.application.capabilities.maps_v2.show) {
    plugins.uiActions.addTriggerActionAsync(
      VISUALIZE_GEO_FIELD_TRIGGER,
      ACTION_VISUALIZE_GEO_FIELD,
      async () => {
        const { visualizeGeoFieldAction } = await import('./visualize_geo_field_action');
        return visualizeGeoFieldAction;
      }
    );
  }

  plugins.uiActions.registerActionAsync('addMapPanelAction', async () => {
    const { getAddMapPanelAction } = await import('./add_map_panel_action');
    return getAddMapPanelAction(plugins);
  });
  plugins.uiActions.attachAction(ADD_PANEL_TRIGGER, 'addMapPanelAction');

  plugins.uiActions.attachAction(ADD_CANVAS_ELEMENT_TRIGGER, 'addMapPanelAction');

  plugins.uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, FILTER_BY_MAP_EXTENT, async () => {
    const { filterByMapExtentAction } = await import('./context_menu_actions_module');
    return filterByMapExtentAction;
  });
  plugins.uiActions.addTriggerActionAsync(
    CONTEXT_MENU_TRIGGER,
    SYNCHRONIZE_MOVEMENT_ACTION,
    async () => {
      const { synchronizeMovementAction } = await import('./context_menu_actions_module');
      return synchronizeMovementAction;
    }
  );
}
