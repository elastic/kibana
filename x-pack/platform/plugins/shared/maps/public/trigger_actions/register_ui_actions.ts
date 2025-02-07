/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  ACTION_VISUALIZE_GEO_FIELD,
  UiActionsStart,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from '@kbn/ui-actions-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { FILTER_BY_MAP_EXTENT } from './filter_by_map_extent/constants';
import { SYNCHRONIZE_MOVEMENT_ACTION } from './synchronize_movement/constants';

export function registerUiActions(core: CoreStart, uiActions: UiActionsStart) {
  if (core.application.capabilities.maps_v2.show) {
    uiActions.addTriggerActionAsync(
      VISUALIZE_GEO_FIELD_TRIGGER,
      ACTION_VISUALIZE_GEO_FIELD,
      async () => {
        const { visualizeGeoFieldAction } = await import('./visualize_geo_field_action');
        return visualizeGeoFieldAction;
      }
    );
  }
  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, FILTER_BY_MAP_EXTENT, async () => {
    const { filterByMapExtentAction } = await import('./context_menu_actions_module');
    return filterByMapExtentAction;
  });
  uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, SYNCHRONIZE_MOVEMENT_ACTION, async () => {
    const { synchronizeMovementAction } = await import('./context_menu_actions_module');
    return synchronizeMovementAction;
  });
}
