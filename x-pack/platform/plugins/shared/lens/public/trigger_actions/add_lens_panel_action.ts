/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableApiContext, apiHasAppContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { LensPluginStartDependencies } from '../plugin';
import { lensVisTypeAlias } from '../vis_type_alias';

export function getAddLensPanelAction(deps: LensPluginStartDependencies) {
  return {
    id: 'addLensPanelAction',
    getIconType: () => lensVisTypeAlias.icon,
    order: lensVisTypeAlias.order,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const stateTransferService = deps.embeddable.getStateTransfer();
      stateTransferService.navigateToEditor(lensVisTypeAlias.alias!.app, {
        path: lensVisTypeAlias.alias!.path,
        state: {
          originatingApp: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().currentAppId
            : '',
          originatingPath: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().getCurrentPath?.()
            : undefined,
          searchSessionId: deps.data.search.session.getSessionId(),
        },
      });
    },
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getDisplayName: () => lensVisTypeAlias.title,
    getDisplayNameTooltip: () => lensVisTypeAlias.description,
  };
}
