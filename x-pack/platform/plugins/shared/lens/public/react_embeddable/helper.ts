/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasParentApi,
  apiPublishesViewMode,
  getInheritedViewMode,
  ViewMode,
  type PublishingSubject,
  apiHasExecutionContext,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { RenderMode } from '@kbn/expressions-plugin/common';
import { SavedObjectReference } from '@kbn/core/types';
import type {
  LensEmbeddableStartServices,
  LensRuntimeState,
  LensSerializedState,
  StructuredDatasourceStates,
} from './types';
import { loadESQLAttributes } from './esql';
import { DatasourceStates, GeneralDatasourceStates } from '../state_management';
import { FormBasedPersistedState } from '../datasources/form_based/types';
import { TextBasedPersistedState } from '../datasources/form_based/esql_layer/types';

export function createEmptyLensState(
  visualizationType: null | string = null,
  title?: LensSerializedState['title'],
  description?: LensSerializedState['description'],
  query?: LensSerializedState['query'],
  filters?: LensSerializedState['filters']
): LensRuntimeState {
  const isTextBased = query && isOfAggregateQueryType(query);
  return {
    attributes: {
      title: title ?? '',
      description: description ?? '',
      visualizationType,
      references: [],
      state: {
        query: query || { query: '', language: 'kuery' },
        filters: filters || [],
        internalReferences: [],
        datasourceStates: { ...(isTextBased ? { textBased: {} } : { formBased: {} }) },
        visualization: {},
      },
    },
  };
}

// Shared logic to ensure the attributes are correctly loaded
// Make sure to inject references from the container down to the runtime state
// this ensure migrations/copy to spaces works correctly
export async function deserializeState(
  {
    attributeService,
    ...services
  }: Pick<
    LensEmbeddableStartServices,
    | 'attributeService'
    | 'data'
    | 'dataViews'
    | 'data'
    | 'visualizationMap'
    | 'datasourceMap'
    | 'uiSettings'
  >,
  rawState: LensSerializedState,
  references?: SavedObjectReference[]
) {
  const fallbackAttributes = createEmptyLensState().attributes;
  if (rawState.savedObjectId) {
    try {
      const { attributes, managed, sharingSavedObjectProps } =
        await attributeService.loadFromLibrary(rawState.savedObjectId);
      return { ...rawState, attributes, managed, sharingSavedObjectProps };
    } catch (e) {
      // return an empty Lens document if no saved object is found
      return { ...rawState, attributes: fallbackAttributes };
    }
  }
  // Inject applied only to by-value SOs
  const newState = attributeService.injectReferences(
    ('attributes' in rawState ? rawState : { attributes: rawState }) as LensRuntimeState,
    references?.length ? references : undefined
  );
  if (newState.isNewPanel) {
    try {
      const newAttributes = await loadESQLAttributes(services);
      // provide a fallback
      return {
        ...newState,
        attributes: newAttributes ?? newState.attributes ?? fallbackAttributes,
      };
    } catch (e) {
      // return an empty Lens document if no saved object is found
      return { ...newState, attributes: fallbackAttributes };
    }
  }
  return newState;
}

export function isTextBasedLanguage(state: LensRuntimeState) {
  return isOfAggregateQueryType(state.attributes?.state.query);
}

export function getViewMode(api: unknown) {
  return apiPublishesViewMode(api) ? getInheritedViewMode(api) : undefined;
}

export function getRenderMode(api: unknown): RenderMode {
  const mode = getViewMode(api) ?? 'view';
  return mode === 'print' ? 'view' : mode;
}

function apiHasExecutionContextFunction(
  api: unknown
): api is { getAppContext: () => { currentAppId: string } } {
  return isObject(api) && 'getAppContext' in api && typeof api.getAppContext === 'function';
}

export function getParentContext(parentApi: unknown) {
  if (apiHasExecutionContext(parentApi)) {
    return parentApi.executionContext;
  }
  if (apiHasExecutionContextFunction(parentApi)) {
    return { type: parentApi.getAppContext().currentAppId };
  }
  return;
}

export function extractInheritedViewModeObservable(
  parentApi?: unknown
): PublishingSubject<ViewMode> {
  if (apiPublishesViewMode(parentApi)) {
    return parentApi.viewMode$;
  }
  if (apiHasParentApi(parentApi)) {
    return extractInheritedViewModeObservable(parentApi.parentApi);
  }
  return new BehaviorSubject<ViewMode>('view');
}

export function getStructuredDatasourceStates(
  datasourceStates?: Readonly<GeneralDatasourceStates>
): StructuredDatasourceStates {
  return {
    formBased: ((datasourceStates as DatasourceStates)?.formBased?.state ??
      datasourceStates?.formBased ??
      undefined) as FormBasedPersistedState,
    textBased: ((datasourceStates as DatasourceStates)?.textBased?.state ??
      datasourceStates?.textBased ??
      undefined) as TextBasedPersistedState,
  };
}
