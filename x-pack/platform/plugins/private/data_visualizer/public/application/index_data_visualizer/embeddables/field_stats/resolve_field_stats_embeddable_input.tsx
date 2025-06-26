/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';
import { FieldStatisticsInitializer } from './field_stats_initializer';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';
import type {
  FieldStatisticsTableEmbeddableState,
  FieldStatsInitialState,
} from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';
import { getOrCreateDataViewByIndexPattern } from '../../search_strategy/requests/get_data_view_by_index_pattern';

export async function resolveEmbeddableFieldStatsUserInput(
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies,
  parentApi: unknown,
  focusedPanelId: string,
  isNewPanel: boolean,
  initialState?: FieldStatisticsTableEmbeddableState,
  fieldStatsControlsApi?: FieldStatsControlsApi
): Promise<FieldStatisticsTableEmbeddableState> {
  const { overlays } = coreStart;

  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const services = {
    ...coreStart,
    ...pluginStart,
  };

  let hasChanged = false;
  return new Promise(async (resolve, reject) => {
    try {
      const cancelChanges = () => {
        // Reset to initialState in case user has changed the preview state
        if (hasChanged && fieldStatsControlsApi && initialState) {
          fieldStatsControlsApi.updateUserInput(initialState);
        }

        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const update = async (nextUpdate: FieldStatsInitialState) => {
        const esqlQuery = nextUpdate?.query?.esql;
        if (isDefined(esqlQuery)) {
          const dv = await getOrCreateDataViewByIndexPattern(
            pluginStart.data.dataViews,
            esqlQuery,
            undefined
          );
          if (dv?.id && nextUpdate.dataViewId !== dv.id) {
            nextUpdate.dataViewId = dv.id;
          }
        }

        resolve(nextUpdate);
        flyoutSession.close();
        overlayTracker?.clearOverlays();
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider services={services}>
            <FieldStatisticsInitializer
              initialInput={initialState}
              onPreview={async (nextUpdate) => {
                if (fieldStatsControlsApi) {
                  fieldStatsControlsApi.updateUserInput(nextUpdate);
                  hasChanged = true;
                }
              }}
              onCreate={update}
              onCancel={cancelChanges}
              isNewPanel={isNewPanel}
            />
          </KibanaContextProvider>,
          coreStart
        ),
        {
          ownFocus: true,
          size: 's',
          paddingSize: 'm',
          hideCloseButton: true,
          type: 'push',
          'data-test-subj': 'fieldStatisticsInitializerFlyout',
          onClose: cancelChanges,
        }
      );

      if (tracksOverlays(parentApi)) {
        parentApi.openOverlay(flyoutSession, { focusedPanelId });
      }
    } catch (error) {
      reject(error);
    }
  });
}
