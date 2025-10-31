/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractLensReferences, injectLensReferences } from '../../common/references';
import type { LensEmbeddableRegistryDefinition } from './types';

export const inject: LensEmbeddableRegistryDefinition['inject'] = (state, references) => {
  return {
    ...state,
    ...injectLensReferences(state, references),
  };
};

export const extract: LensEmbeddableRegistryDefinition['extract'] = (state) => {
  const { state: newState, references } = extractLensReferences(state);
  return {
    state: {
      ...state,
      ...newState,
    },
    references,
  };
};
