/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { apiCanAddNewPanel, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import {
  ADD_VECTOR_PROJECTION_ACTION_ID,
  VECTOR_PROJECTION_EMBEDDABLE_TYPE,
} from '../../common/constants';
import type { VectorProjectionEmbeddableState } from '../../server';
import { openEditorFlyout } from '../components/open_editor_flyout';

export const addVectorProjectionAction: ActionDefinition<EmbeddableApiContext> = {
  id: ADD_VECTOR_PROJECTION_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  getIconType: () => 'dotInCircle',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable: parentApi, returnFocus }) => {
    if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();
    openEditorFlyout({
      parentApi,
      isNewPanel: true,
      returnFocus,
      onSave: (config) => {
        parentApi.addNewPanel<VectorProjectionEmbeddableState>({
          panelType: VECTOR_PROJECTION_EMBEDDABLE_TYPE,
          serializedState: config,
        });
      },
    });
  },
  getDisplayName: () =>
    i18n.translate('xpack.vectorProjection.addPanel.displayName', {
      defaultMessage: 'Vector projection',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('xpack.vectorProjection.addPanel.tooltip', {
      defaultMessage: 'Project a dense_vector field to 2D or 3D with UMAP.',
    }),
};
