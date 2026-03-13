/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import { isOfAggregateQueryType } from '@kbn/es-query';
import {
  EVENT_ANNOTATION_GROUP_TYPE,
  type EventAnnotationGroupConfig,
} from '@kbn/event-annotation-common';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import fastIsEqual from 'fast-deep-equal';
import type {
  DatasourceStates,
  FormBasedPersistedState,
  GeneralDatasourceStates,
  LensRuntimeState,
  LensSerializedState,
  StructuredDatasourceStates,
  TextBasedPersistedState,
  XYState,
  XYByReferenceAnnotationLayerConfig,
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
  const refId = 'ref_id' in state ? state.ref_id : undefined;

  if (refId) {
    try {
      const { attributes, managed, sharingSavedObjectProps } =
        await attributeService.loadFromLibrary(refId);
      return {
        ...state,
        ref_id: refId,
        attributes,
        managed,
        sharingSavedObjectProps,
      } satisfies LensRuntimeState;
    } catch (e) {
      // return an empty Lens document if no saved object is found
      return { ...state, attributes: fallbackAttributes };
    }
  }

  const newState = transformFromApiConfig(state as LensSerializedAPIConfig) as LensRuntimeState;

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
  const { ref_id, attributes } = state;

  if (ref_id) {
    return {
      ref_id,
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
  | 'ref_id'
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
    ref_id,
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
    ref_id,
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

export function hasAnnotationGroupReference(state: LensRuntimeState, groupId: string): boolean {
  const refs = state.attributes?.references ?? [];
  return refs.some((ref) => ref.type === EVENT_ANNOTATION_GROUP_TYPE && ref.id === groupId);
}

/**
 * Returns updated state with library annotation group data for all by-reference
 * annotation layers that reference the given group ID, or undefined if no layers matched.
 *
 * Handles both hydrated layers (annotationGroupId on the layer) and persisted layers
 * (annotationGroupRef resolved via the references array).
 */
export function updateAttributesWithAnnotation(
  state: LensRuntimeState,
  groupId: string,
  libraryGroup: EventAnnotationGroupConfig
): LensRuntimeState | undefined {
  const { attributes } = state;
  if (attributes.visualizationType !== 'lnsXY') return undefined;

  const vizState = attributes.state.visualization as XYState | undefined;
  if (!vizState?.layers) return undefined;

  // In the persisted form, annotation layers use annotationGroupRef (a reference name)
  // instead of annotationGroupId. Build a lookup to resolve these via the references array.
  const refNameToGroupId = new Map<string, string>();
  for (const ref of attributes.references ?? []) {
    if (ref.type === EVENT_ANNOTATION_GROUP_TYPE) {
      refNameToGroupId.set(ref.name, ref.id);
    }
  }

  let changed = false;
  const layers = vizState.layers.map((layer) => {
    // Hydrated form: annotationGroupId is directly on the layer during inline editing
    // and on saved dashboards after injection.
    if ('annotationGroupId' in layer && layer.annotationGroupId === groupId) {
      changed = true;
      return {
        ...(layer as XYByReferenceAnnotationLayerConfig),
        annotations: structuredClone(libraryGroup.annotations),
        ignoreGlobalFilters: libraryGroup.ignoreGlobalFilters,
        indexPatternId: libraryGroup.indexPatternId,
        __lastSaved: libraryGroup,
      };
    }

    // Persisted form: duplicated panels on unsaved dashboards store annotationGroupRef
    // instead of annotationGroupId — resolve it via the references array.
    if (
      'annotationGroupRef' in layer &&
      refNameToGroupId.get((layer as { annotationGroupRef: string }).annotationGroupRef) === groupId
    ) {
      changed = true;
      return {
        layerId: layer.layerId,
        layerType: layer.layerType,
        annotationGroupId: groupId,
        annotations: structuredClone(libraryGroup.annotations),
        ignoreGlobalFilters: libraryGroup.ignoreGlobalFilters,
        indexPatternId: libraryGroup.indexPatternId,
        __lastSaved: libraryGroup,
      } as XYByReferenceAnnotationLayerConfig;
    }

    return layer;
  });

  return changed
    ? {
        ...state,
        attributes: {
          ...attributes,
          state: { ...attributes.state, visualization: { ...vizState, layers } },
        },
      }
    : undefined;
}

/**
 * Saves all modified linked (by-reference) annotation layers to the library.
 * Each layer with local changes is committed via `updateAnnotationGroup`, which
 * also fires `annotationGroupUpdated$` to notify other panels.
 *
 * Returns an immutably-updated viz state with `__lastSaved` synced on each
 * saved layer, so serialization produces clean by-reference layers rather than
 * "linked with local changes" layers.
 */
export async function saveUpdatedLinkedAnnotationsToLibrary(
  vizState: unknown,
  eventAnnotationService: EventAnnotationServiceType
): Promise<unknown> {
  const xyState = vizState as XYState | undefined;
  if (!xyState?.layers) return vizState;

  let updatedLayers: XYState['layers'] | undefined;

  for (let i = 0; i < xyState.layers.length; i++) {
    const layer = xyState.layers[i];
    if (
      'annotationGroupId' in layer &&
      '__lastSaved' in layer &&
      !fastIsEqual(
        {
          annotations: layer.annotations,
          ignoreGlobalFilters: layer.ignoreGlobalFilters,
          indexPatternId: layer.indexPatternId,
        },
        {
          annotations: (layer as XYByReferenceAnnotationLayerConfig).__lastSaved.annotations,
          ignoreGlobalFilters: (layer as XYByReferenceAnnotationLayerConfig).__lastSaved
            .ignoreGlobalFilters,
          indexPatternId: (layer as XYByReferenceAnnotationLayerConfig).__lastSaved.indexPatternId,
        }
      )
    ) {
      const refLayer = layer as XYByReferenceAnnotationLayerConfig;
      const groupConfig: EventAnnotationGroupConfig = {
        annotations: refLayer.annotations,
        indexPatternId: refLayer.indexPatternId,
        ignoreGlobalFilters: refLayer.ignoreGlobalFilters,
        title: refLayer.__lastSaved.title,
        description: refLayer.__lastSaved.description,
        tags: refLayer.__lastSaved.tags,
        dataViewSpec: refLayer.__lastSaved.dataViewSpec,
      };

      await eventAnnotationService.updateAnnotationGroup(groupConfig, refLayer.annotationGroupId);

      if (!updatedLayers) {
        updatedLayers = [...xyState.layers];
      }
      updatedLayers[i] = { ...refLayer, __lastSaved: groupConfig };
    }
  }

  if (!updatedLayers) return vizState;

  return { ...xyState, layers: updatedLayers };
}
