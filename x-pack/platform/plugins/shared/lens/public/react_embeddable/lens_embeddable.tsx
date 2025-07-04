/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTitleManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { merge } from 'rxjs';
import { DOC_TYPE } from '../../common/constants';
import {
  LensApi,
  LensEmbeddableStartServices,
  LensRuntimeState,
  LensSerializedState,
} from './types';

import { loadEmbeddableData } from './data_loader';
import { isTextBasedLanguage, deserializeState } from './helper';
import { initializeEditApi } from './initializers/initialize_edit';
import { initializeInspector } from './initializers/initialize_inspector';
import {
  dashboardServicesComparators,
  initializeDashboardServices,
} from './initializers/initialize_dashboard_services';
import { initializeInternalApi } from './initializers/initialize_internal_api';
import {
  initializeSearchContext,
  searchContextComparators,
} from './initializers/initialize_search_context';
import { initializeActionApi } from './initializers/initialize_actions';
import { initializeIntegrations } from './initializers/initialize_integrations';
import { initializeStateManagement } from './initializers/initialize_state_management';
import { LensEmbeddableComponent } from './renderer/lens_embeddable_component';

export const createLensEmbeddableFactory = (
  services: LensEmbeddableStartServices
): EmbeddableFactory<LensSerializedState, LensApi> => {
  return {
    type: DOC_TYPE,
    /**
     * This is called after the deserialize, so some assumptions can be made about its arguments:
     * @param state     the Lens "runtime" state, which means that 'attributes' is always present.
     *                  The difference for a by-value and a by-ref can be determined by the presence of 'savedObjectId' in the state
     * @param buildApi  a utility function to build the Lens API together to instrument the embeddable container on how to detect
     *                  significative changes in the state (i.e. worth a save or not)
     * @param uuid      a unique identifier for the embeddable panel
     * @param parentApi a set of props passed down from the embeddable container. Note: no assumptions can be made about its content
     *                  so the usage of type-guards is recommended before extracting data from it.
     *                  Due to the new embeddable being rendered by a <ReactEmbeddableRenderer /> wrapper, this is the only way
     *                  to pass data/props from a container.
     *                  Typical use cases is the forwarding of the unifiedSearch context to the embeddable, or the passing props
     *                  from the Lens component container to the Lens embeddable.
     * @returns an object with the Lens API and the React component to render in the Embeddable
     */
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const titleManager = initializeTitleManager(initialState.rawState);

      const dynamicActionsManager = services.embeddableEnhanced?.initializeEmbeddableDynamicActions(
        uuid,
        () => titleManager.api.title$.getValue(),
        initialState
      );

      const initialRuntimeState = await deserializeState(
        services,
        initialState.rawState,
        initialState.references
      );

      /**
       * Observables and functions declared here are used internally to store mutating state values
       * This is an internal API not exposed outside of the embeddable.
       */
      const internalApi = initializeInternalApi(
        initialRuntimeState,
        parentApi,
        titleManager,
        services
      );

      /**
       * Initialize various configurations required to build all the required
       * parts for the Lens embeddable.
       */
      const stateConfig = initializeStateManagement(initialRuntimeState, internalApi);
      const dashboardConfig = initializeDashboardServices(
        initialRuntimeState,
        getLatestState,
        internalApi,
        stateConfig,
        parentApi,
        titleManager,
        services
      );

      const inspectorConfig = initializeInspector(services);

      const searchContextConfig = initializeSearchContext(
        initialRuntimeState,
        internalApi,
        parentApi,
        services
      );

      const editConfig = initializeEditApi(
        uuid,
        initialRuntimeState,
        getLatestState,
        internalApi,
        stateConfig.api,
        inspectorConfig.api,
        searchContextConfig.api,
        isTextBasedLanguage,
        services,
        parentApi
      );

      const integrationsConfig = initializeIntegrations(
        getLatestState,
        dynamicActionsManager?.serializeState,
        services
      );
      const actionsConfig = initializeActionApi(
        uuid,
        initialRuntimeState,
        getLatestState,
        parentApi,
        searchContextConfig.api,
        internalApi,
        services,
        dynamicActionsManager
      );

      /**
       * This is useful to have always the latest version of the state
       * at hand when calling callbacks or performing actions
       */
      function getLatestState(): LensRuntimeState {
        return {
          ...actionsConfig.getLatestState(),
          ...dashboardConfig.getLatestState(),
          ...searchContextConfig.getLatestState(),
          ...stateConfig.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<LensSerializedState>({
        uuid,
        parentApi,
        serializeState: integrationsConfig.api.serializeState,
        anyStateChange$: merge(
          actionsConfig.anyStateChange$,
          dashboardConfig.anyStateChange$,
          stateConfig.anyStateChange$,
          searchContextConfig.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...stateConfig.getComparators(),
            ...actionsConfig.getComparators(),
            ...dashboardServicesComparators,
            ...searchContextComparators,
            isNewPanel: 'skip',
            references: 'skip',
          };
        },
        onReset: async (lastSaved) => {
          actionsConfig.reinitializeState(lastSaved?.rawState);
          dashboardConfig.reinitializeState(lastSaved?.rawState);
          searchContextConfig.reinitializeState(lastSaved?.rawState);
          if (!lastSaved) return;
          const lastSavedRuntimeState = await deserializeState(
            services,
            lastSaved.rawState,
            lastSaved.references
          );
          stateConfig.reinitializeRuntimeState(lastSavedRuntimeState);
        },
      });

      /**
       * Lens API is the object that can be passed to the final component/renderer and
       * provide access to the services for and by the outside world
       */
      const api: LensApi = finalizeApi(
        // Note: the order matters here, so make sure to have the
        // dashboardConfig who owns the savedObjectId after the
        // stateConfig one who owns the inline editing
        {
          ...unsavedChangesApi,
          ...editConfig.api,
          ...inspectorConfig.api,
          ...searchContextConfig.api,
          ...actionsConfig.api,
          ...integrationsConfig.api,
          ...stateConfig.api,
          ...dashboardConfig.api,
        }
      );

      // Compute the expression using the provided parameters
      // Inside a subscription will be updated based on each unifiedSearch change
      // and as side effect update few observables as  expressionParams$, expressionAbortController$ and renderCount$ with the new values upon updates
      const expressionConfig = loadEmbeddableData(
        uuid,
        getLatestState,
        api,
        parentApi,
        internalApi,
        services
      );

      const onUnmount = () => {
        expressionConfig.cleanup();
        actionsConfig.cleanup();
        searchContextConfig.cleanup();
      };

      return {
        api,
        Component: () => (
          <LensEmbeddableComponent api={api} internalApi={internalApi} onUnmount={onUnmount} />
        ),
      };
    },
  };
};
