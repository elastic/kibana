/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type {
  DatasourceStates,
  FormBasedPersistedState,
  GeneralDatasourceStates,
  LensRuntimeState,
  LensSerializedState,
  StructuredDatasourceStates,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import type { LensByValueSerializedAPIConfig, LensSerializedAPIConfig } from '@kbn/lens-common-2';
import type { SerializedTitles, ViewMode } from '@kbn/presentation-publishing';
import {
  apiHasExecutionContext,
  apiHasParentApi,
  apiPublishesViewMode,
  getInheritedViewMode,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import { BehaviorSubject } from 'rxjs';

import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import { getLensBuilder } from '../lazy_builder';
import type { ESQLStartServices } from './esql';
import { loadESQLAttributes } from './esql';
import type { LensEmbeddableStartServices } from './types';

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
  state: LensSerializedAPIConfig
): Promise<LensRuntimeState> {
  const fallbackAttributes = createEmptyLensState().attributes;
  const savedObjectId = 'savedObjectId' in state ? state.savedObjectId : undefined;

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

/**
 * !Important! call stripInheritedContext before transforming to API config
 */
export function transformToApiConfig(state: StrippedLensState): LensSerializedAPIConfig {
  const { savedObjectId, attributes } = state;

  if (savedObjectId) {
    return {
      savedObjectId,
    };
  }

  const builder = getLensBuilder();

  if (!builder?.isEnabled) {
    // builder not enabled, return the state as is
    return state as LensByValueSerializedAPIConfig;
  }

  const chartType = builder.getType(attributes);

  if (!builder.isSupported(chartType)) {
    // TODO: remove this once all formats are supported
    return state as LensByValueSerializedAPIConfig;
  }

  if (!attributes) {
    // This should only ever handle by-value state.
    throw new Error('attributes are missing');
  }

  const apiConfigAttributes = builder.toAPIFormat({
    ...attributes,
    visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS,
  });

  return {
    ...state,
    attributes: apiConfigAttributes,
  };
}

/**
 * Keys that should be persisted at the panel level.
 * All other properties from LensSerializedState are inherited from the
 * dashboard/container or are runtime-only and should not be persisted.
 *
 * TODO - LensSerializedState should really be paired down to match this list.
 * it is currently used as a runtime state object but it shouldn't be.
 */
type IncludedPanelStateKeys =
  | 'savedObjectId'
  | 'attributes'
  | 'references'
  | 'time_range'
  | keyof SerializedTitles
  | keyof SerializedDrilldowns;

export type StrippedLensState = Pick<LensSerializedState, IncludedPanelStateKeys>;

/**
 * The serialized state contains many properties that are inherited from the dashboard or other container
 * or are runtime-only (like executionContext) and should not be persisted at the panel
 * level. This function strips those out to ensure only panel-level state is persisted.
 */
export function stripInheritedContext(state: LensSerializedState): StrippedLensState {
  const {
    savedObjectId,
    attributes,
    // LensWithReferences
    references,
    // LensUnifiedSearchContext (only time_range is panel-level)
    time_range,
    // SerializedTitles
    title,
    description,
    hide_title,
    hide_border,
    // SerializedDrilldowns
    drilldowns,
  } = state;

  return {
    savedObjectId,
    attributes,
    references,
    time_range,
    title,
    description,
    hide_title,
    hide_border,
    drilldowns,
  };
}
