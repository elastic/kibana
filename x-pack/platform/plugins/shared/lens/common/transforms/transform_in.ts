/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractLensReferences } from '../references';
import type {
  LensByRefTransformInResult,
  LensByValueTransformInResult,
  LensTransformIn,
} from './types';
import { isByRefLensState } from './utils';

/**
 * Transform from Lens API format to Lens Serialized State
 */
export const getTransformIn = (): LensTransformIn => {
  return function transformIn(state) {
    if (isByRefLensState(state)) {
      return {
        state,
      } satisfies LensByRefTransformInResult;
    }

    return extractLensReferences(state) satisfies LensByValueTransformInResult;
  };
};
