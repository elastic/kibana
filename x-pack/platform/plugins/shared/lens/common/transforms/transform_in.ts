/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { LensTransformDependencies } from '.';
import { DOC_TYPE } from '../constants';
import { extractLensReferences } from '../references';
import type {
  LensByRefTransformInResult,
  LensByValueTransformInResult,
  LensTransformIn,
} from './types';
import { LENS_SAVED_OBJECT_REF_NAME, isByRefLensConfig } from './utils';
import type { LensSerializedState } from '../../public';

/**
 * Transform from Lens API format to Lens Serialized State
 */
export const getTransformIn = ({
  builder,
  transformEnhancementsIn,
}: LensTransformDependencies): LensTransformIn => {
  return function transformIn(config) {
    const { enhancementsState: enhancements = null, enhancementsReferences = [] } =
      config.enhancements ? transformEnhancementsIn?.(config.enhancements) ?? {} : {};
    const enhancementsState = enhancements ? { enhancements } : {};

    if (isByRefLensConfig(config)) {
      const { savedObjectId: id, ...rest } = config;
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

    const chartType = builder.getType(config.attributes);

    if (!builder.isSupported(chartType)) {
      const { state: lensState, references: lensReferences } = extractLensReferences(
        config as LensSerializedState
      );
      // TODO: remove this once all formats are supported
      // when not supported, no transform is needed
      return {
        state: lensState,
        ...enhancementsState,
        references: [...lensReferences, ...enhancementsReferences],
      } satisfies LensByValueTransformInResult;
    }

    if (!config.attributes) {
      // Not sure if this is possible
      throw new Error('attributes are missing');
    }

    const serializedState = isLensAPIFormat(config.attributes)
      ? builder.fromAPIFormat(config.attributes)
      : config.attributes;
    const { state: lensState, references: lensReferences } = extractLensReferences(serializedState);

    return {
      state: {
        ...lensState,
        attributes: serializedState,
      },
      ...enhancementsState,
      references: [...lensReferences, ...enhancementsReferences],
    } satisfies LensByValueTransformInResult;
  };
};
