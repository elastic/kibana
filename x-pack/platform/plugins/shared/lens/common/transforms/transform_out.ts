/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { LENS_UNKNOWN_VIS, type LensByValueSerializedState } from '@kbn/lens-common';
import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { LensTransformDependencies } from '.';
import { transformToV1LensItemAttributes } from '../content_management/v1';
import { transformToV2LensItemAttributes } from '../content_management/v2';
import { injectLensReferences } from '../references';
import type {
  LensByRefTransformOutResult,
  LensByValueTransformOutResult,
  LensTransformOut,
} from './types';
import { findLensReference, isByRefLensState } from './utils';
import { isLensAttributesV0, isLensAttributesV1 } from '../content_management/utils';

/**
 * Transform from Lens Serialized State to Lens API format
 */
export const getTransformOut = ({
  builder,
  transformEnhancementsOut,
}: LensTransformDependencies): LensTransformOut => {
  return function transformOut(state, panelReferences) {
    const enhancements = state.enhancements
      ? transformEnhancementsOut?.(state.enhancements, panelReferences ?? [])
      : undefined;
    const enhancementsState = (
      enhancements ? { enhancements } : {}
    ) as DynamicActionsSerializedState;

    const savedObjectRef = findLensReference(panelReferences);

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
      ...state,
      attributes: apiConfig,
    } satisfies LensByValueTransformOutResult;
  };
};

/**
 * Handles transforming old lens SO in dashboard to v1 Lens SO
 */
function migrateAttributes(attributes: LensByValueSerializedState['attributes']): LensAttributes {
  if (!attributes) {
    throw new Error('Why are attributes undefined?');
  }

  const { visualizationType } = attributes;

  if (!visualizationType) {
    throw new Error('Missing visualizationType');
  }

  const newAttributes = { ...attributes, visualizationType };
  if (isLensAttributesV0(newAttributes) || isLensAttributesV1(newAttributes)) {
    const v1Attributes = transformToV1LensItemAttributes(newAttributes);
    const v2Attributes = transformToV2LensItemAttributes({ ...v1Attributes, visualizationType });
    return {
      ...attributes,
      ...v2Attributes,
      version: LENS_ITEM_VERSION_V2 as LensAttributes['version'],
    };
  }

  return newAttributes as LensAttributes;
}
