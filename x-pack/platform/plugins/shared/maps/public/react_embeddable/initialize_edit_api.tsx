/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import { apiHasAppContext } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { APP_ID, getEditPath, getFullPath, MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { getCore, getEmbeddableService, getHttp, getMapsCapabilities } from '../kibana_services';
import type { MapEmbeddableState } from '../../common';

export function initializeEditApi(
  uuid: string,
  getState: () => MapEmbeddableState,
  parentApi?: unknown,
  savedObjectId?: string,
  panelSettingsApi?: PanelSettingsApi
) {
  if (!parentApi || !apiHasAppContext(parentApi)) return {};

  const navigateToEditor = async () => {
    const parentApiContext = parentApi.getAppContext();
    const stateTransfer = getEmbeddableService().getStateTransfer();
    await stateTransfer.navigateToEditor(APP_ID, {
      path: getEditPath(savedObjectId),
      state: {
        embeddableId: uuid,
        valueInput: getState(),
        originatingApp: parentApiContext.currentAppId,
        originatingPath: parentApiContext.getCurrentPath?.(),
      },
    });
  };

  return {
    getTypeDisplayName: () => {
      return MAP_EMBEDDABLE_NAME;
    },
    onEdit: async () => {
      if (!panelSettingsApi) {
        return navigateToEditor();
      }
      openLazyFlyout({
        core: getCore(),
        parentApi,
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          const { MapEditFlyout } = await import('./edit_flyout/map_edit_flyout');
          return (
            <MapEditFlyout
              api={panelSettingsApi}
              parentApi={parentApi}
              getState={getState}
              navigateToEditor={navigateToEditor}
              closeFlyout={closeFlyout}
              ariaLabelledBy={ariaLabelledBy}
            />
          );
        },
        flyoutProps: {
          'data-test-subj': 'panelEditFlyout',
          focusedPanelId: uuid,
        },
      });
    },
    isEditingEnabled: () => {
      return getMapsCapabilities().save as boolean;
    },
    // the edit flyout, which includes the panel settings, opens when the map can be edited
    hasPanelSettingsInEditFlyout: () => {
      return Boolean(panelSettingsApi) && Boolean(getMapsCapabilities().save);
    },
    getEditHref: async () => {
      return getHttp().basePath.prepend(getFullPath(savedObjectId));
    },
  };
}
