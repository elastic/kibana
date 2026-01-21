/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewMode } from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  getInheritedViewMode,
  type PublishingSubject,
  apiHasExecutionContext,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import type {
  LensRuntimeState,
  LensSerializedState,
  StructuredDatasourceStates,
  DatasourceStates,
  GeneralDatasourceStates,
  FormBasedPersistedState,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import type { LensByValueSerializedAPIConfig, LensSerializedAPIConfig } from '@kbn/lens-common-2';

import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { ESQLStartServices } from './esql';
import { loadESQLAttributes } from './esql';
import { LENS_ITEM_LATEST_VERSION } from '../../common/constants';
import type { LensEmbeddableStartServices } from './types';
import { getLensBuilder } from '../lazy_builder';

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
      version: LENS_ITEM_LATEST_VERSION,
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

/**
 * Shared logic to ensure the attributes are correctly loaded
 * Make sure to inject references from the container down to the runtime state
 * this ensure migrations/copy to spaces works correctly
 **/
export async function deserializeState(
  {
    attributeService,
    ...services
  }: Pick<LensEmbeddableStartServices, 'attributeService'> & ESQLStartServices,
  { savedObjectId, ...state }: LensSerializedAPIConfig
): Promise<LensRuntimeState> {
  const fallbackAttributes = createEmptyLensState().attributes;

  if (savedObjectId) {
    try {
      const { attributes, managed, sharingSavedObjectProps } =
        await attributeService.loadFromLibrary(savedObjectId);
      return {
        ...state,
        savedObjectId,
        attributes,
        managed,
        sharingSavedObjectProps,
      } satisfies LensRuntimeState;
    } catch (e) {
      // return an empty Lens document if no saved object is found
      return { ...state, attributes: fallbackAttributes };
    }
  }

  const newState = transformFromApiConfig(state) as LensRuntimeState;

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

export function transformFromApiConfig(state: LensSerializedAPIConfig): LensSerializedState {
  const builder = getLensBuilder();

  if (!builder?.isEnabled) {
    // builder not enabled, return the state as is
    return state as LensSerializedState;
  }

  const chartType = builder.getType(state.attributes);

  if (!builder.isSupported(chartType)) {
    return state as LensSerializedState;
  }

  if (!state.attributes) {
    // Not sure if this is possible
    throw new Error('attributes are missing');
  }

  // check if already converted
  if (!isLensAPIFormat(state.attributes)) {
    return state as LensSerializedState;
  }

  const attributes = builder.fromAPIFormat(state.attributes);

  return {
    ...state,
    attributes,
  };
}

export function transformToApiConfig(state: LensSerializedState): LensByValueSerializedAPIConfig {
  if (state.savedObjectId) {
    return {
      ...state,
      attributes: undefined,
    };
  }

  const builder = getLensBuilder();

  if (!builder?.isEnabled) {
    // builder not enabled, return the state as is
    return state as LensByValueSerializedAPIConfig;
  }

  const chartType = builder.getType(state.attributes);

  if (!builder.isSupported(chartType)) {
    // TODO: remove this once all formats are supported
    return state as LensByValueSerializedAPIConfig;
  }

  if (!state.attributes) {
    // This should only ever handle by-value state.
    throw new Error('attributes are missing');
  }

  const apiConfigAttributes = builder.toAPIFormat({
    ...state.attributes,
    visualizationType: state.attributes.visualizationType ?? LENS_UNKNOWN_VIS,
  });

  return {
    ...state,
    attributes: apiConfigAttributes,
  };
}
