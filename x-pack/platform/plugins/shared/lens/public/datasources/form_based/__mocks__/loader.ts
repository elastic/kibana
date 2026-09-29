/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import { createMockedIndexPattern, createMockedRestrictedIndexPattern } from '../mocks';
import type { FormBasedPrivateState } from '@kbn/lens-common';
import type * as Loader from '../loader';

export function loadInitialState() {
  const indexPattern = createMockedIndexPattern();
  const result: FormBasedPrivateState = {
    currentIndexPatternId: indexPattern.id,
    layers: {},
  };
  return result;
}

const originalLoader = await vi.importActual<typeof Loader>('../loader');

export const extractReferences = originalLoader.extractReferences;

export const injectReferences = originalLoader.injectReferences;

export function loadInitialDataViews() {
  const indexPattern = createMockedIndexPattern();
  const restricted = createMockedRestrictedIndexPattern();
  return {
    indexPatternRefs: [],
    indexPatterns: {
      [indexPattern.id]: indexPattern,
      [restricted.id]: restricted,
    },
  };
}
