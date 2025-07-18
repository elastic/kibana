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
  SAVED_OBJECT_REF_NAME,
  SerializedPanelState,
  apiIsOfType,
  areTriggersDisabled,
  findSavedObjectRef,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, merge } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
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
import {
  crossPanelActionsComparators,
  initializeCrossPanelActions,
} from './initialize_cross_panel_actions';
import { initializeDataViews } from './initialize_data_views';
import { initializeFetch } from './initialize_fetch';
import { initializeEditApi } from './initialize_edit_api';
import { extractReferences } from '../../common/migrations/references';
import { isMapRendererApi } from './map_renderer/types';

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

function injectReferences(serializedState?: SerializedPanelState<MapSerializedState>) {
  if (!serializedState) return {};

  const rawState = { ...serializedState.rawState };
  const references = serializedState.references ?? [];

  const savedObjectRef = findSavedObjectRef(MAP_SAVED_OBJECT_TYPE, references);

  if (savedObjectRef) {
    rawState.savedObjectId = savedObjectRef.id;
  }

  return inject(rawState as EmbeddableStateWithType, references) as unknown as MapSerializedState;
}

export const mapEmbeddableFactory: EmbeddableFactory<MapSerializedState, MapApi> = {
  type: MAP_SAVED_OBJECT_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const state = injectReferences(initialState);
    const savedMap = new SavedMap({ mapSerializedState: state });
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
    const dynamicActionsManager = getEmbeddableEnhanced()?.initializeEmbeddableDynamicActions(
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
      const { rawState: dynamicActionsState, references: dynamicActionsReferences } =
        dynamicActionsManager?.serializeState() ?? {};
      const rawState = {
        ...getLatestState(),
        ...dynamicActionsState,
      };

      if (apiIsOfType(parentApi, 'canvas')) {
        return {
          rawState: getByReferenceState(rawState, libraryId),
          references: [],
        };
      }

      const { savedObjectId, ...byRefState } = getByReferenceState(rawState, libraryId);
      return {
        rawState: byRefState,
        references: [
          ...(dynamicActionsReferences ?? []),
          {
            name: SAVED_OBJECT_REF_NAME,
            type: MAP_SAVED_OBJECT_TYPE,
            id: libraryId,
          },
        ],
      };
    }

    function serializeByValue() {
      const { rawState: dynamicActionsState, references: dynamicActionsReferences } =
        dynamicActionsManager?.serializeState() ?? {};
      const rawState = {
        ...getLatestState(),
        ...dynamicActionsState,
      };

      /**
       * Canvas embeddables do not support references
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
        references: [...references, ...(dynamicActionsReferences ?? [])],
      };
    }

    function serializeState() {
      const savedObjectId = savedMap.getSavedObjectId();
      return savedObjectId ? serializeByReference(savedObjectId) : serializeByValue();
    }

    const unsavedChangesApi = initializeUnsavedChanges<MapSerializedState>({
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
          ...(dynamicActionsManager?.comparators ?? { enhancements: 'skip' }),
          ...reduxSyncComparators,
          ...titleComparators,
          ...timeRangeComparators,
          attributes:
            savedMap.getSavedObjectId() !== undefined
              ? 'skip'
              : (a, b) => {
                  return a?.layerListJSON === b?.layerListJSON;
                },
          mapSettings: 'deepEquality',
          savedObjectId: 'skip',
        };
      },
      onReset: async (lastSaved) => {
        dynamicActionsManager?.reinitializeState(lastSaved?.rawState ?? {});
        timeRangeManager.reinitializeState(lastSaved?.rawState);
        titleManager.reinitializeState(lastSaved?.rawState);

        await savedMap.reset(injectReferences(lastSaved));
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

          return latestState.savedObjectId
            ? getByReferenceState(latestState, latestState.savedObjectId)
            : getByValueState(latestState, savedMap.getAttributes());
        },
        parentApi,
        state.savedObjectId
      ),
      ...initializeLibraryTransforms(
        Boolean(savedMap.getSavedObjectId()),
        serializeByReference,
        serializeByValue
      ),
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
