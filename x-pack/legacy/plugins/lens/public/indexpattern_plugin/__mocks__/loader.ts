/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockedIndexPattern, createMockedRestrictedIndexPattern } from '../mocks';
import { IndexPatternPrivateState } from '../types';

export function loadInitialState() {
  const indexPattern = createMockedIndexPattern();
  const restricted = createMockedRestrictedIndexPattern();
  const result: IndexPatternPrivateState = {
    currentIndexPatternId: indexPattern.id,
    indexPatternRefs: [],
    existingFields: {},
    indexPatterns: {
      [indexPattern.id]: indexPattern,
      [restricted.id]: restricted,
    },
    layers: {},
    showEmptyFields: false,
  };
  return result;
}
