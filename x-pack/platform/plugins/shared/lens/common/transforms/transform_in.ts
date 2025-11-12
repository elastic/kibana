/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensTransformDependencies } from '.';
import { DOC_TYPE } from '../constants';
import { extractLensReferences } from '../references';
import type {
  LensByRefTransformInResult,
  LensByValueTransformInResult,
  LensTransformIn,
} from './types';
import { LENS_SAVED_OBJECT_REF_NAME, isByRefLensState } from './utils';

/**
 * Transform from Lens API format to Lens Serialized State
 */
export const getTransformIn = ({
  transformEnhancementsIn,
}: LensTransformDependencies): LensTransformIn => {
  return function transformIn(state) {
    const { enhancementsState: enhancements = null, enhancementsReferences = [] } =
      state.enhancements ? transformEnhancementsIn?.(state.enhancements) ?? {} : {};
    const enhancementsState = enhancements ? { enhancements } : {};

    if (isByRefLensState(state)) {
      const { savedObjectId: id, ...rest } = state;
      return {
        state: rest,
        ...enhancementsState,
        references: [
          {
            name: LENS_SAVED_OBJECT_REF_NAME,
            type: DOC_TYPE,
            id: id!,
          },
          ...enhancementsReferences,
        ],
      } satisfies LensByRefTransformInResult;
    }

    const { state: lensState, references: lensReferences } = extractLensReferences(state);

    return {
      state: lensState,
      ...enhancementsState,
      references: [...lensReferences, ...enhancementsReferences],
    } satisfies LensByValueTransformInResult;
  };
};
