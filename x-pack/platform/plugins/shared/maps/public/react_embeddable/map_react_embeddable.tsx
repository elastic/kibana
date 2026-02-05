/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  areTriggersDisabled,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, merge } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  APPLY_FILTER_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MapApi } from './types';
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
import {
  crossPanelActionsComparators,
  initializeCrossPanelActions,
} from './initialize_cross_panel_actions';
import { initializeDataViews } from './initialize_data_views';
import { initializeFetch } from './initialize_fetch';
import { initializeEditApi } from './initialize_edit_api';
import { isMapRendererApi } from './map_renderer/types';
import type { MapByReferenceState, MapEmbeddableState } from '../../common';
import { initializeProjectRoutingManager } from './project_routing_manager';

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

export const mapEmbeddableFactory: EmbeddableFactory<MapEmbeddableState, MapApi> = {
  type: MAP_SAVED_OBJECT_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const state = initialState;
    const savedMap = new SavedMap({ mapEmbeddableState: state });
    await savedMap.whenReady();

    // eslint bug, eslint thinks api is never reassigned even though it is
    // eslint-disable-next-line prefer-const
    let api: MapApi | undefined;
    const getApi = () => api;
    const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    const controlledBy = getControlledBy(uuid);
    const titleManager = initializeTitleManager(state);
    const timeRangeManager = initializeTimeRangeManager(state);
    const dynamicActionsManager = await getEmbeddableEnhanced()?.initializeEmbeddableDynamicActions(
      uuid,
      () => titleManager.api.title$.getValue(),
      initialState
    );
    const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();

    const defaultTitle$ = new BehaviorSubject<string | undefined>(savedMap.getAttributes().title);
    const defaultDescription$ = new BehaviorSubject<string | undefined>(
      savedMap.getAttributes().description
    );
    const reduxSync = initializeReduxSync({
      savedMap,
      state,
      syncColors$: apiPublishesSettings(parentApi) ? parentApi.settings.syncColors$ : undefined,
      uuid,
    });
    const actionHandlers = initializeActionHandlers(getApi);
    const crossPanelActions = initializeCrossPanelActions({
      controlledBy,
      getActionContext: actionHandlers.getActionContext,
      getApi,
      state,
      savedMap,
      uuid,
    });
    const projectRoutingManager = await initializeProjectRoutingManager(savedMap);

    function getLatestState() {
      return {
        ...state,
        ...timeRangeManager.getLatestState(),
        ...titleManager.getLatestState(),
        ...(dynamicActionsManager?.getLatestState() ?? {}),
        ...crossPanelActions.getLatestState(),
        ...reduxSync.getLatestState(),
      };
    }

    function serializeByReference(libraryId: string) {
      return getByReferenceState(getLatestState(), libraryId);
    }

    function serializeByValue() {
      return getByValueState(getLatestState(), savedMap.getAttributes());
    }

    function serializeState() {
      const savedObjectId = savedMap.getSavedObjectId();
      return savedObjectId ? serializeByReference(savedObjectId) : serializeByValue();
    }

    const unsavedChangesApi = initializeUnsavedChanges<MapEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : []),
        crossPanelActions.anyStateChange$,
        reduxSync.anyStateChange$,
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$
      ),
      getComparators: () => {
        return {
          ...crossPanelActionsComparators,
          ...(dynamicActionsManager?.comparators ?? { drilldowns: 'skip', enhancements: 'skip' }),
          ...reduxSyncComparators,
          ...titleComparators,
          ...timeRangeComparators,
          attributes: savedMap.getSavedObjectId() !== undefined ? 'skip' : 'deepEquality',
          mapSettings: 'deepEquality',
          savedObjectId: 'skip',
        };
      },
      onReset: async (lastSaved) => {
        dynamicActionsManager?.reinitializeState(lastSaved ?? {});
        timeRangeManager.reinitializeState(lastSaved);
        titleManager.reinitializeState(lastSaved);

        if (lastSaved) {
          await savedMap.reset(lastSaved);
        }
      },
    });

    api = finalizeApi({
      defaultTitle$,
      defaultDescription$,
      ...unsavedChangesApi,
      ...timeRangeManager.api,
      ...(dynamicActionsManager?.api ?? {}),
      ...titleManager.api,
      ...reduxSync.api,
      ...initializeEditApi(
        uuid,
        () => {
          const latestState = getLatestState();

          return (latestState as MapByReferenceState).savedObjectId
            ? getByReferenceState(latestState, (latestState as MapByReferenceState).savedObjectId)
            : getByValueState(latestState, savedMap.getAttributes());
        },
        parentApi,
        (state as MapByReferenceState).savedObjectId
      ),
      ...initializeLibraryTransforms(
        Boolean(savedMap.getSavedObjectId()),
        serializeByReference,
        serializeByValue
      ),
      ...initializeDataViews(savedMap.getStore()),
      ...projectRoutingManager.api,
      serializeState,
      supportedTriggers: () => {
        return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
      },
    });

    const unsubscribeFromFetch = initializeFetch({
      api,
      controlledBy,
      getIsFilterByMapExtent: crossPanelActions.getIsFilterByMapExtent,
      searchSessionMapBuffer: state.mapBuffer,
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
