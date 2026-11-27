/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import {
  apiIsPresentationContainer,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { CUSTOM_APP_EMBEDDABLE_TYPE, CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import { ADD_CUSTOM_APP_ACTION_ID } from '../../common/constants';
import { createEmptyDocument } from '../default_document';

const displayName = i18n.translate('xpack.customApp.addPanel.displayName', {
  defaultMessage: 'Custom app',
});

export const getAddCustomAppAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_CUSTOM_APP_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  getIconType: () => 'apps',
  isCompatible: async ({ embeddable }) => apiIsPresentationContainer(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

    await embeddable.addNewPanel({
      panelType: CUSTOM_APP_EMBEDDABLE_TYPE,
      serializedState: { version: CUSTOM_APP_STATE_VERSION, document: createEmptyDocument() },
    });
  },
  getDisplayName: () => displayName,
});
