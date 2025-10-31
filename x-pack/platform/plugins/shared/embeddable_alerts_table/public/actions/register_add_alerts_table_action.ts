/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ADD_ALERTS_TABLE_ACTION_ID } from '../constants';

export interface AddAlertsTableActionDeps {
  coreServices: CoreStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
}

export const registerAddAlertsTableAction = ({
  coreServices,
  uiActions,
  unifiedSearch,
  data,
}: AddAlertsTableActionDeps) => {
  uiActions.registerActionAsync<EmbeddableApiContext>(ADD_ALERTS_TABLE_ACTION_ID, async () => {
    const { getAddAlertsTableAction } = await import('./add_alerts_table_action');
    return getAddAlertsTableAction(coreServices, unifiedSearch, data);
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_ALERTS_TABLE_ACTION_ID);
};
