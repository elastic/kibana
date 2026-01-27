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
    const enhancementsResult =
      transformEnhancementsIn && config.enhancements
        ? transformEnhancementsIn(config.enhancements)
        : { state: undefined, references: [] };

    if (isByRefLensConfig(config)) {
      const { savedObjectId: id, ...rest } = config;
      return {
        state: rest,
        ...(enhancementsResult.state ? { enhancements: enhancementsResult.state } : {}),
        references: [
          {
            name: LENS_SAVED_OBJECT_REF_NAME,
            type: DOC_TYPE,
            id: id!,
          },
          ...enhancementsResult.references,
        ],
      } satisfies LensByRefTransformInResult;
    }

    const chartType = builder.getType(config.attributes);

    if (!builder.isSupported(chartType)) {
      const { state, references } = extractLensReferences(config as LensSerializedState);
      // TODO: remove this once all formats are supported
      // when not supported, no transform is needed
      return {
        state,
        ...(enhancementsResult.state ? { enhancements: enhancementsResult.state } : {}),
        references: [...references, ...enhancementsResult.references],
      } satisfies LensByValueTransformInResult;
    }

    if (!config.attributes) {
      // Not sure if this is possible
      throw new Error('attributes are missing');
    }

    const attributes = isLensAPIFormat(config.attributes)
      ? builder.fromAPIFormat(config.attributes)
      : config.attributes;
    const { state, references } = extractLensReferences({
      ...config,
      attributes,
    });

    return {
      state,
      ...(enhancementsResult.state ? { enhancements: enhancementsResult.state } : {}),
      references: [...references, ...enhancementsResult.references],
    } satisfies LensByValueTransformInResult;
  };
};
