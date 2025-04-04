/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { EmbeddableFactory, VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  SerializedPanelState,
  apiIsOfType,
  areTriggersDisabled,
  initializeTimeRangeManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { inject } from '../../common/embeddable';
import type { MapApi, MapSerializedState } from './types';
import { SavedMap } from '../routes/map_page';
import { initializeReduxSync, reduxSyncComparators } from './initialize_redux_sync';
import {
  getByReferenceState,
  getByValueState,
  initializeLibraryTransforms,
} from './library_transforms';
import { getEmbeddableEnhanced, getSpacesApi } from '../kibana_services';
import { initializeActionHandlers } from './initialize_action_handlers';
import { MapContainer } from '../connected_components/map_container';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { crossPanelActionComparators, initializeCrossPanelActions } from './initialize_cross_panel_actions';
import { initializeDataViews } from './initialize_data_views';
import { initializeFetch } from './initialize_fetch';
import { initializeEditApi } from './initialize_edit_api';
import { extractReferences } from '../../common/migrations/references';
import { MapAttributes } from '../../common/content_management';
import { MapSettings } from '../../common/descriptor_types';
import { isMapRendererApi } from './map_renderer/types';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { timeRangeComparators } from '@kbn/presentation-publishing/interfaces/fetch/time_range_manager';

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

function deserializeState(state: SerializedPanelState<MapSerializedState>) {
  return state.rawState
    ? (inject(
        state.rawState as EmbeddableStateWithType,
        state.references ?? []
      ) as unknown as MapSerializedState)
    : {};
}

export const mapEmbeddableFactory: EmbeddableFactory<MapSerializedState, MapApi> = {
  type: MAP_SAVED_OBJECT_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const mapSerializedState = deserializeState(initialState);
    const savedMap = new SavedMap({ mapSerializedState });
    await savedMap.whenReady();

    const attributes$ = new BehaviorSubject<MapAttributes | undefined>(mapSerializedState.attributes);
    const mapSettings$ = new BehaviorSubject<Partial<MapSettings> | undefined>(mapSerializedState.mapSettings);
    const savedObjectId$ = new BehaviorSubject<string | undefined>(mapSerializedState.savedObjectId);

    // eslint bug, eslint thinks api is never reassigned even though it is
    // eslint-disable-next-line prefer-const
    let api: MapApi | undefined;
    const getApi = () => api;
    const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    const controlledBy = getControlledBy(uuid);
    const titleManager = initializeTitleManager(mapSerializedState);
    const timeRangeManager = initializeTimeRangeManager(mapSerializedState);
    const dynamicActionsApi = getEmbeddableEnhanced()?.initializeReactEmbeddableDynamicActions(
      uuid,
      () => titleManager.api.title$.getValue(),
      mapSerializedState
    );
    const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

    const defaultTitle$ = new BehaviorSubject<string | undefined>(savedMap.getAttributes().title);
    const defaultDescription$ = new BehaviorSubject<string | undefined>(
      savedMap.getAttributes().description
    );
    const reduxSync = initializeReduxSync({
      savedMap,
      state: mapSerializedState,
      syncColors$: apiPublishesSettings(parentApi) ? parentApi.settings.syncColors$ : undefined,
      uuid,
    });
    const actionHandlers = initializeActionHandlers(getApi);
    const crossPanelActions = initializeCrossPanelActions({
      controlledBy,
      getActionContext: actionHandlers.getActionContext,
      getApi,
      state: mapSerializedState,
      savedMap,
      uuid,
    });

    function getState() {
      return {
        ...mapSerializedState,
        ...timeRangeManager.getLatestState(),
        ...titleManager.getLatestState(),
        ...(dynamicActionsApi?.serializeDynamicActions() ?? {}),
        ...crossPanelActions.serialize(),
        ...reduxSync.getLatestState(),
      };
    }

    function serializeState() {
      const rawState = getState();

      // by-reference embeddable
      if (rawState.savedObjectId) {
        // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
        return {
          rawState: getByReferenceState(rawState, rawState.savedObjectId),
          references: [],
        };
      }

      /**
       * Canvas by-value embeddables do not support references
       */
      if (apiIsOfType(parentApi, 'canvas')) {
        return {
          rawState: getByValueState(rawState, savedMap.getAttributes()),
          references: [],
        };
      }

      // by-value embeddable
      const { attributes, references } = extractReferences({
        attributes: savedMap.getAttributes(),
      });

      return {
        rawState: getByValueState(rawState, attributes),
        references,
      };
    }

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      serializeState,
      latestRuntimeState$: combineLatest([
        reduxSync.latestState$,
        titleManager.latestState$,
        timeRangeManager.latestState$,
      ]),
      getComparators: () => {
        return {
          ...crossPanelActionComparators,
          ...reduxSyncComparators,
          ...titleComparators,
          ...timeRangeComparators,
          attributes: 'referenceEquality',
          enhancements: 'skip',
          mapSettings: 'referenceEquality',
          savedObjectId: 'referenceEquality',
        };
      },
      onReset: (lastSaved) => {
        attributes$.next(lastSaved?.attributes);
        mapSettings$.next(lastSaved?.mapSettings);
        savedObjectId$.next(lastSaved?.savedObjectId);
        reduxSync.reinitializeState(lastSaved);
        titleManager.reinitializeState(lastSaved);
      },
    });

    api = finalizeApi({
      defaultTitle$,
      defaultDescription$,
      ...unsavedChangesApi,
      ...timeRangeManager.api,
      ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
      ...titleManager.api,
      ...reduxSync.api,
      ...initializeEditApi(uuid, getState, parentApi, mapSerializedState.savedObjectId),
      ...initializeLibraryTransforms(savedMap, serializeState),
      ...initializeDataViews(savedMap.getStore()),
      serializeState,
      supportedTriggers: () => {
        return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
      },
    });

    const unsubscribeFromFetch = initializeFetch({
      api,
      controlledBy,
      getIsFilterByMapExtent: crossPanelActions.getIsFilterByMapExtent,
      searchSessionMapBuffer: mapSerializedState.mapBuffer,
      store: savedMap.getStore(),
    });

    return {
      api,
      Component: () => {
        const [defaultTitle, title, defaultDescription, description] = useBatchedPublishingSubjects(
          defaultTitle$,
          titleManager.api.title$,
          defaultDescription$,
          titleManager.api.description$
        );

        useEffect(() => {
          return () => {
            crossPanelActions.cleanup();
            reduxSync.cleanup();
            unsubscribeFromFetch();
            maybeStopDynamicActions?.stopDynamicActions();
          };
        }, []);

        return sharingSavedObjectProps &&
          spaces &&
          sharingSavedObjectProps?.outcome === 'conflict' ? (
          <div className="mapEmbeddedError">
            <EuiEmptyPrompt
              iconType="warning"
              iconColor="danger"
              data-test-subj="embeddable-maps-failure"
              body={spaces.ui.components.getEmbeddableLegacyUrlConflict({
                targetType: MAP_SAVED_OBJECT_TYPE,
                sourceId: sharingSavedObjectProps.sourceId!,
              })}
            />
          </div>
        ) : (
          <Provider store={savedMap.getStore()}>
            <MapContainer
              onSingleValueTrigger={actionHandlers.onSingleValueTrigger}
              addFilters={
                (isMapRendererApi(parentApi) &&
                  typeof parentApi.hideFilterActions === 'boolean' &&
                  parentApi.hideFilterActions) ||
                areTriggersDisabled(api)
                  ? null
                  : actionHandlers.addFilters
              }
              getFilterActions={actionHandlers.getFilterActions}
              getActionContext={actionHandlers.getActionContext}
              renderTooltipContent={
                isMapRendererApi(parentApi) && parentApi.getTooltipRenderer
                  ? parentApi.getTooltipRenderer()
                  : undefined
              }
              title={title ?? defaultTitle}
              description={description ?? defaultDescription}
              waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(savedMap.getStore())}
              isSharable={
                isMapRendererApi(parentApi) && typeof parentApi.isSharable === 'boolean'
                  ? parentApi.isSharable
                  : true
              }
            />
          </Provider>
        );
      },
    };
  },
};
