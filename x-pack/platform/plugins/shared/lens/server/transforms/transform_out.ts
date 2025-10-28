/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

import type { LensByValueSerializedState } from '@kbn/lens-common';
import {
  LENS_ITEM_VERSION_V1,
  transformToV1LensItemAttributes,
} from '../../common/content_management/v1';
import type {
  LensByRefTransformOutResult,
  LensByValueTransformOutResult,
  LensTransformOut,
} from './types';
import { isByRefLensState } from './utils';

/**
 * Transform from Lens Serialized State to Lens API format
 */
export const getTransformOut = (builder: LensConfigBuilder): LensTransformOut => {
  return function transformOut(state, references) {
    if (isByRefLensState(state)) {
      return {
        ...state,
      } satisfies LensByRefTransformOutResult;
    }

    const migratedAttributes = migrateAttributes(state.attributes);

    const chartType = builder.getType(migratedAttributes);

    if (!builder.isSupported(chartType)) {
      // TODO: remove this once all formats are supported
      return {
        ...state,
        // return old lens serialized state
        attributes: migratedAttributes,
      } as unknown as LensByValueTransformOutResult;
    }

    const apiConfig = builder.toAPIFormat({
      ...migratedAttributes,
      visualizationType: migratedAttributes.visualizationType ?? 'lnsXy',
    });

    return {
      ...state,
      attributes: apiConfig,
    } satisfies LensByValueTransformOutResult;
  };
};

/**
 * Handles transforming old lens SO in dashboard to v1 Lens SO
 *
 * TODO: Use CM transforms instead
 */
function migrateAttributes(attributes: LensByValueSerializedState['attributes']) {
  if (!attributes) {
    throw new Error('Why are attributes undefined?');
  }

  const version = attributes.version ?? 0;

  let newAttributes = { ...attributes };
  if (version < LENS_ITEM_VERSION_V1) {
    newAttributes = {
      ...newAttributes,
      ...transformToV1LensItemAttributes({
        ...attributes,
        visualizationType: attributes.visualizationType ?? 'lnsXy',
      }),
    };
  }

  return newAttributes;
}
