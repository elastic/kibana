/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { LensByValueSerializedState } from '@kbn/lens-common';
import type { LensTransformDependencies } from '.';
import { LENS_ITEM_VERSION_V1, transformToV1LensItemAttributes } from '../content_management/v1';
import { injectLensReferences } from '../references';
import type {
  LensByRefTransformOutResult,
  LensByValueTransformOutResult,
  LensTransformOut,
} from './types';
import { findLensReference, isByRefLensState } from './utils';

/**
 * Transform from Lens Serialized State to Lens API format
 */
export const getTransformOut = ({
  transformEnhancementsOut,
}: LensTransformDependencies): LensTransformOut => {
  return function transformOut(state, references) {
    const enhancements = state.enhancements
      ? transformEnhancementsOut?.(state.enhancements, references ?? [])
      : undefined;
    const enhancementsState = (
      enhancements ? { enhancements } : {}
    ) as DynamicActionsSerializedState;

    const savedObjectRef = findLensReference(references);

    if (savedObjectRef && isByRefLensState(state)) {
      return {
        ...state,
        ...enhancementsState,
        savedObjectId: savedObjectRef.id,
      } satisfies LensByRefTransformOutResult;
    }

    const migratedAttributes = migrateAttributes(state.attributes);
    const injectedState = injectLensReferences(
      {
        ...state,
        ...enhancementsState,
        attributes: migratedAttributes,
      },
      references
    );

    return injectedState satisfies LensByValueTransformOutResult;
  };
};

/**
 * Handles transforming old lens SO in dashboard to v1 Lens SO
 */
function migrateAttributes(attributes: LensByValueSerializedState['attributes']) {
  if (!attributes) {
    throw new Error('Why are attributes undefined?');
  }

  const { visualizationType } = attributes;

  if (!visualizationType) {
    throw new Error('Missing visualizationType');
  }

  const version = attributes.version ?? 0;

  let newAttributes = { ...attributes };
  if (version < LENS_ITEM_VERSION_V1) {
    newAttributes = {
      ...newAttributes,
      ...transformToV1LensItemAttributes({ ...attributes, visualizationType }),
    };
  }

  return newAttributes;
}
