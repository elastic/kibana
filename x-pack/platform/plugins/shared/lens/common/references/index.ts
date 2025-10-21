/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';

import type { LensSerializedState } from '../../public';

export const injectLensReferences = (
  state: LensSerializedState,
  references: Reference[] = []
): LensSerializedState => {
  const clonedState = cloneDeep(state);

  if (clonedState.savedObjectId || !clonedState.attributes) {
    return clonedState;
  }

  // match references based on name, so only references associated with this lens panel are injected.
  const matchedReferences: Reference[] = [];

  if (Array.isArray(clonedState.attributes.references)) {
    clonedState.attributes.references.forEach((serializableRef) => {
      const internalReference = serializableRef;
      const matchedReference = references.find(
        (reference) => reference.name === internalReference.name
      );
      if (matchedReference) matchedReferences.push(matchedReference);
    });
  }

  clonedState.attributes.references = matchedReferences;

  return clonedState;
};

export const extractLensReferences = (
  state: LensSerializedState
): {
  state: LensSerializedState;
  references: Reference[];
} => {
  return {
    state,
    references: state.attributes?.references ?? state.references ?? [],
  };
};
