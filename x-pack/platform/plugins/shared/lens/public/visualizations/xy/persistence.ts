/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';

import {
  isPersistedAnnotationsLayer,
  isPersistedByReferenceAnnotationsLayer,
  isPersistedByValueAnnotationsLayer,
  type AnnotationGroups,
  type XYPersistedByReferenceAnnotationLayerConfig,
  type XYPersistedLayerConfig,
  type XYPersistedLinkedByValueAnnotationLayerConfig,
  type XYPersistedState,
} from '@kbn/lens-common';
import { nonNullable } from '../../utils';
import { annotationLayerHasUnsavedChanges } from './state_helpers';
import type {
  XYAnnotationLayerConfig,
  XYByReferenceAnnotationLayerConfig,
  XYLayerConfig,
  XYState,
} from './types';
import { isAnnotationsLayer, isByReferenceAnnotationsLayer } from './visualization_helpers';

/**
 * Converts persisted state to runtime state.
 *
 * Injects references to produce a fully formed XYState that can be used by the visualization.
 */
export function convertPersistedState(
  state: XYPersistedState,
  annotationGroups?: AnnotationGroups,
  references?: Reference[]
) {
  return structuredClone(injectReferences(state, annotationGroups, references));
}

/**
 * Converts runtime state to persisted state.
 *
 * @param state The runtime XYState to convert.
 * @returns An object containing the persistable state and any references.
 */
export function convertToPersistable(state: XYState) {
  const persistableState: XYPersistedState = state;
  const references: Reference[] = [];
  const persistableLayers: XYPersistedLayerConfig[] = [];

  persistableState.layers.forEach((layer) => {
    // anything but an annotation can just be persisted as is
    if (!isAnnotationsLayer(layer)) {
      persistableLayers.push(layer);
      return;
    }
    // a by value annotation layer can be persisted with some config tweak
    if (!isByReferenceAnnotationsLayer(layer)) {
      const { indexPatternId, ...persistableLayer } = layer;
      references.push({
        type: 'index-pattern',
        id: indexPatternId,
        name: getLayerReferenceName(layer.layerId),
      });
      persistableLayers.push({ ...persistableLayer, persistanceType: 'byValue' });
      return;
    }

    /*
     * by reference annotation layer needs to be handled carefully
     */

    // make this id stable so that it won't retrigger all the time a change diff
    const referenceName = `ref-${layer.layerId}`;
    references.push({
      type: EVENT_ANNOTATION_GROUP_TYPE,
      id: layer.annotationGroupId,
      name: referenceName,
    });

    // if there's no divergence from the library, it can be persisted without much ado
    if (!annotationLayerHasUnsavedChanges(layer)) {
      const persistableLayer: XYPersistedByReferenceAnnotationLayerConfig = {
        persistanceType: 'byReference',
        layerId: layer.layerId,
        layerType: layer.layerType,
        annotationGroupRef: referenceName,
      };

      persistableLayers.push(persistableLayer);
      return;
    }
    // this is the case where the by reference diverged from library
    // so it needs to persist some extra metadata
    const persistableLayer: XYPersistedLinkedByValueAnnotationLayerConfig = {
      persistanceType: 'linked',
      cachedMetadata: layer.cachedMetadata || {
        title: layer.__lastSaved.title,
        description: layer.__lastSaved.description,
        tags: layer.__lastSaved.tags,
      },
      layerId: layer.layerId,
      layerType: layer.layerType,
      annotationGroupRef: referenceName,
      annotations: layer.annotations,
      ignoreGlobalFilters: layer.ignoreGlobalFilters,
    };
    persistableLayers.push(persistableLayer);

    references.push({
      type: 'index-pattern',
      id: layer.indexPatternId,
      name: getLayerReferenceName(layer.layerId),
    });
  });

  return {
    references,
    state: { ...persistableState, layers: persistableLayers },
  };
}

function getLayerReferenceName(layerId: string) {
  return `xy-visualization-layer-${layerId}`;
}

function needsInjectReferences(state: XYPersistedState | XYState): state is XYPersistedState {
  return state.layers.some(isPersistedAnnotationsLayer);
}

function injectReferences(
  state: XYPersistedState,
  annotationGroups?: AnnotationGroups,
  references?: Reference[]
): XYState {
  if (!references || !references.length) {
    return state as XYState;
  }
  if (!needsInjectReferences(state)) {
    // Runtime-format state still needs orphan cleanup: remove by-reference annotation
    // layers whose annotation group was deleted from the library.
    if (annotationGroups) {
      const runtimeState = state as XYState;
      const filteredLayers = runtimeState.layers.filter((layer) => {
        if (!isAnnotationsLayer(layer) || !isByReferenceAnnotationsLayer(layer)) return true;
        return layer.annotationGroupId in annotationGroups;
      });
      if (filteredLayers.length !== runtimeState.layers.length) {
        return { ...runtimeState, layers: filteredLayers };
      }
    }
    return state as XYState;
  }

  if (!annotationGroups) {
    throw new Error(
      'xy visualization: injecting references relies on annotation groups but they were not provided'
    );
  }

  // called on-demand since indexPattern reference won't be here on the vis if its a by-reference group
  const getIndexPatternIdFromReferences = (annotationLayerId: string) => {
    const fallbackIndexPatternId = references.find(({ type }) => type === 'index-pattern')!.id;
    return (
      references.find(({ name }) => name === getLayerReferenceName(annotationLayerId))?.id ||
      fallbackIndexPatternId
    );
  };

  return {
    ...state,
    layers: state.layers
      .map((persistedLayer) => {
        if (!isPersistedAnnotationsLayer(persistedLayer)) {
          return persistedLayer as XYLayerConfig;
        }

        let injectedLayer: XYAnnotationLayerConfig;

        if (isPersistedByValueAnnotationsLayer(persistedLayer)) {
          injectedLayer = {
            ...persistedLayer,
            indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
          };
        } else {
          const annotationGroupId = references?.find(
            ({ name }) => name === persistedLayer.annotationGroupRef
          )?.id;

          const annotationGroup = annotationGroupId
            ? annotationGroups[annotationGroupId]
            : undefined;

          if (!annotationGroupId || !annotationGroup) {
            return undefined; // the annotation group this layer was referencing is gone, so remove the layer
          }

          // declared as a separate variable for type checking
          const commonProps: Pick<
            XYByReferenceAnnotationLayerConfig,
            'layerId' | 'layerType' | 'annotationGroupId' | '__lastSaved'
          > = {
            layerId: persistedLayer.layerId,
            layerType: persistedLayer.layerType,
            annotationGroupId,
            __lastSaved: annotationGroup,
          };

          if (isPersistedByReferenceAnnotationsLayer(persistedLayer)) {
            // a clean by-reference layer inherits everything from the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: annotationGroup.ignoreGlobalFilters,
              indexPatternId: annotationGroup.indexPatternId,
              annotations: structuredClone(annotationGroup.annotations),
            };
          } else {
            // a linked by-value layer gets settings from visualization state while
            // still maintaining the reference to the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: persistedLayer.ignoreGlobalFilters,
              indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
              annotations: structuredClone(persistedLayer.annotations),
              cachedMetadata: persistedLayer.cachedMetadata,
            };
          }
        }

        return injectedLayer;
      })
      .filter(nonNullable),
  };
}
