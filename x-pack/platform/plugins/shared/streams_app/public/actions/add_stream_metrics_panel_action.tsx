/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import {
  ADD_STREAM_METRICS_PANEL_ACTION_ID,
  STREAM_METRICS_EMBEDDABLE_ID,
} from '../../common/embeddable';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamMetricsSerializedState } from '../embeddable/types';

const STREAMS_GROUPING = [
  {
    id: 'streams',
    getDisplayName: () =>
      i18n.translate('xpack.streams.embeddable.grouping.title', {
        defaultMessage: 'Streams',
      }),
    getIconType: () => 'logoElastic',
    order: 0,
  },
];

export function createAddStreamMetricsPanelAction(
  coreStart: CoreStart,
  pluginsStart: StreamsAppStartDependencies
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_STREAM_METRICS_PANEL_ACTION_ID,
    grouping: STREAMS_GROUPING,
    order: 10,
    getIconType: () => 'visGauge',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

      try {
        const { openStreamConfiguration } = await import('./open_stream_configuration');
        const initialState = await openStreamConfiguration(coreStart, pluginsStart);
        embeddable.addNewPanel<StreamMetricsSerializedState>(
          {
            panelType: STREAM_METRICS_EMBEDDABLE_ID,
            serializedState: initialState,
          },
          {
            displaySuccessMessage: true,
          }
        );
      } catch (e) {
        // User cancelled the flyout
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.streams.streamMetricsEmbeddable.action.displayName', {
        defaultMessage: 'Stream metrics',
      }),
  };
}
