/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';

import type {
  LensByRefTransformInResult,
  LensByValueTransformInResult,
  LensTransformIn,
} from '../../../server/transforms/types';
import { isByRefLensConfig } from './utils';

/**
 * Transform from Lens API format to Lens Serialized State
 */
export const getTransformIn = (builder: LensConfigBuilder): LensTransformIn => {
  return function transformIn(config) {
    if (!config?.attributes) {
      throw new Error('Lens config is undefined');
    }
    if (isByRefLensConfig(config)) {
      return {
        state: config,
        references: config.references,
      } satisfies LensByRefTransformInResult;
    }

    const chartType = builder.getType(config.attributes);

    if (!builder.isSupported(config.attributes)) {
      // TODO: remove this once all formats are supported
      // when not supported, no transform is needed
      return {
        state: config,
        references: config.references,
      } as unknown as LensByValueTransformInResult;
    }

    const serializedState = builder.fromAPIFormat(config.attributes);

    return {
      state: {
        ...config,
        attributes: serializedState,
      },
      references: config.references,
    } satisfies LensByValueTransformInResult;
  };
};
