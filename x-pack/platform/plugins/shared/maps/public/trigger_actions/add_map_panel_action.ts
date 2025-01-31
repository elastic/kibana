/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableApiContext, apiHasAppContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { APP_ICON, APP_ID, APP_NAME, MAP_PATH } from '../../common/constants';
import { MapsPluginStartDependencies } from '../plugin';

export function getAddMapPanelAction(deps: MapsPluginStartDependencies) {
  return {
    id: 'addMapPanelAction',
    getIconType: () =>  APP_ICON,
    order: 40,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const stateTransferService = deps.embeddable.getStateTransfer();
      stateTransferService.navigateToEditor(APP_ID, {
        path: `/${MAP_PATH}`,
        state: {
          originatingApp: apiHasAppContext(embeddable) ? embeddable.getAppContext().currentAppId : '',
          originatingPath:  apiHasAppContext(embeddable) ? embeddable.getAppContext().getCurrentPath?.() : undefined,
          searchSessionId: deps.data.search.session.getSessionId(),
        },
      });
    },
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getDisplayName: () => APP_NAME,
    getDisplayNameTooltip: () => 
      i18n.translate('xpack.maps.visTypeAlias.description', {
        defaultMessage: 'Create and style maps with multiple layers and indices.',
      })
  };
};
