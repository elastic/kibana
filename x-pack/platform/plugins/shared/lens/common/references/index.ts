/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, uniqBy } from 'lodash';

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

  // TODO: find a way to cull erroneous dashboard references
  const combinedReferences = uniqBy([...references, ...clonedState.attributes.references], 'name');

  clonedState.attributes.references = combinedReferences;

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
