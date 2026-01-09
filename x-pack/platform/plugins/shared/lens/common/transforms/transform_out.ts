/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { LENS_UNKNOWN_VIS, type LensByValueSerializedState } from '@kbn/lens-common';
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
 * Transform from Lens Stored State to Lens API format
 */
export const getTransformOut = ({
  builder,
  transformEnhancementsOut,
}: LensTransformDependencies): LensTransformOut => {
  return function transformOut(state, panelReferences) {
    const stateWithApiTitles = transformTitlesOut(state);
    const enhancements = stateWithApiTitles.enhancements
      ? transformEnhancementsOut?.(stateWithApiTitles.enhancements, panelReferences ?? [])
      : undefined;
    const enhancementsState = (
      enhancements ? { enhancements } : {}
    ) as DynamicActionsSerializedState;

    const savedObjectRef = findLensReference(panelReferences);

    if (savedObjectRef && isByRefLensState(stateWithApiTitles)) {
      return {
        ...stateWithApiTitles,
        ...enhancementsState,
        savedObjectId: savedObjectRef.id,
      } satisfies LensByRefTransformOutResult;
    }

    const migratedAttributes = migrateAttributes(stateWithApiTitles.attributes);
    const injectedState = injectLensReferences(
      {
        ...stateWithApiTitles,
        ...enhancementsState,
        attributes: migratedAttributes,
      },
      panelReferences
    );

    const chartType = builder.getType(migratedAttributes);

    if (!builder.isSupported(chartType)) {
      // TODO: remove this once all formats are supported
      return injectedState as LensByValueTransformOutResult;
    }

    const apiConfig = builder.toAPIFormat({
      ...migratedAttributes,
      visualizationType: migratedAttributes.visualizationType ?? LENS_UNKNOWN_VIS,
    });

    return {
      ...stateWithApiTitles,
      attributes: apiConfig,
    } satisfies LensByValueTransformOutResult;
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
