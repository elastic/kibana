/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensSerializedState } from '@kbn/lens-common';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { LENS_UNKNOWN_VIS, type LensByValueSerializedState } from '@kbn/lens-common';
import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import type { LensAttributes, LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
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
 * Transform from Lens Stored State to Lens API format
 */
export const getTransformOut = (
  builder: LensConfigBuilder,
  transformDrilldownsOut: DrilldownTransforms['transformOut']
): LensTransformOut => {
  return function transformOut(storedState, panelReferences) {
    const transformsFlow = flow(
      transformTitlesOut<LensSerializedState>,
      (state: LensSerializedState) => transformDrilldownsOut(state, panelReferences)
    );
    const state = transformsFlow(storedState);

    const savedObjectRef = findLensReference(panelReferences);

    if (savedObjectRef && isByRefLensState(state)) {
      return {
        ...state,
        savedObjectId: savedObjectRef.id,
      } satisfies LensByRefTransformOutResult;
    }

    const migratedAttributes = migrateAttributes(state.attributes);
    const injectedState = injectLensReferences(
      {
        ...state,
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
