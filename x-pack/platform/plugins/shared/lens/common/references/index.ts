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

  const panelReferencesMap = references.reduce<Map<string, Reference>>((acc, reference) => {
    return acc.set(reference.name, reference);
  }, new Map());

  const newReferences = clonedState.attributes.references.map((lensRef) => {
    const panelReference = panelReferencesMap.get(lensRef.name);
    return panelReference?.type === lensRef.type ? panelReference : lensRef;
  });

  clonedState.attributes.references = newReferences;

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
