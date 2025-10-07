/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import type {
  EmbeddableRegistryDefinition,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common';
import type { LensRuntimeState } from '../../public';

export type LensEmbeddablePersistableState = EmbeddableStateWithType & {
  attributes: SerializableRecord;
};

/**
 * Hardcoded layer key used in LensConfigBuilder
 */
const apiLayerKey = 'layer_0';

export const inject: NonNullable<EmbeddableRegistryDefinition['inject']> = (
  state,
  references
): EmbeddableStateWithType => {
  const typedState = cloneDeep(state) as unknown as LensRuntimeState;

  if (typedState.savedObjectId) {
    return typedState as unknown as EmbeddableStateWithType;
  }

  // match references based on name, so only references associated with this lens panel are injected.
  const matchedReferences: Reference[] = [];

  if (Array.isArray(typedState.attributes.references)) {
    typedState.attributes.references.forEach((serializableRef) => {
      const internalReference = serializableRef;
      const matchedReference = references.find(
        (reference) => reference.name === internalReference.name
      );
      if (matchedReference) matchedReferences.push(matchedReference);
    });
  }

  if (matchedReferences.length === 0) {
    // TODO temporary fix for layer ref lookup
    // if empty and has layer_0 it will set the references to those from the attributes
    const layerIndexRef = typedState.attributes.references.find((r) =>
      r.name.endsWith(apiLayerKey)
    );

    if (layerIndexRef?.type === 'index-pattern') {
      matchedReferences.push(...typedState.attributes.references);
    }
  }

  typedState.attributes.references = matchedReferences;

  return typedState as unknown as EmbeddableStateWithType;
};

export const extract: NonNullable<EmbeddableRegistryDefinition['extract']> = (state) => {
  let references: Reference[] = [];
  const typedState = state as unknown as LensRuntimeState;

  if ('attributes' in typedState && typedState.attributes !== undefined) {
    references = typedState.attributes.references;
  }

  return { state, references };
};
