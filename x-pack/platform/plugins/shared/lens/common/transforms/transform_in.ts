/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isLensAPIFormat,
  isLensLegacyFormat,
  type LensConfigBuilder,
} from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG_DEFAULT } from '@kbn/as-code-shared-schemas';
import { DOC_TYPE } from '../constants';
import { extractLensReferences } from '../references';
import type {
  LensByRefTransformInResult,
  LensByValueTransformInResult,
  LensTransformIn,
} from './types';
import { LENS_SAVED_OBJECT_REF_NAME, isByRefLensConfig } from './utils';
import type { LensSerializedState } from '../../public';
import { isFlattenedAPIConfig, unflattenAPIConfig } from './utils';
import { findInvalidDurationFormat } from './ga_schema_validator';

/**
 * Transform from Lens API format to Lens Serialized State
 */
export const getTransformIn = (
  builder: LensConfigBuilder,
  transformDrilldownsIn: DrilldownTransforms['transformIn'],
  isDashboardAppRequest: boolean
): LensTransformIn => {
  return function transformIn(config, useGASchemas = AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG_DEFAULT) {
    const { state: storedConfig, references: drilldownReferences } = transformDrilldownsIn(config);

    if (isByRefLensConfig(storedConfig)) {
      const { ref_id, ...rest } = storedConfig;
      return {
        // ref_id is extracted to references, so the stored state doesn't include it
        state: rest,
        references: [
          {
            name: LENS_SAVED_OBJECT_REF_NAME,
            type: DOC_TYPE,
            id: ref_id!,
          },
          ...drilldownReferences,
        ],
      } satisfies LensByRefTransformInResult;
    }

    if (isDashboardAppRequest && !builder.isEnabled) {
      const { state, references } = extractLensReferences(storedConfig as LensSerializedState);
      return {
        state,
        references: [...references, ...drilldownReferences],
      } satisfies LensByValueTransformInResult;
    }

    const lensConfig =
      isFlattenedAPIConfig(storedConfig) && !isLensLegacyFormat(storedConfig)
        ? unflattenAPIConfig(storedConfig)
        : storedConfig;

    if (!('attributes' in lensConfig)) {
      // Not sure if this is possible
      throw new Error('attributes are missing');
    }

    const chartType = builder.getType(lensConfig.attributes);
    // should be filtered out my unmapped panel check
    if (!builder.isSupported(chartType)) {
      throw new Error(`Lens "${chartType}" chart type is not supported`);
    }

    if (isLensAPIFormat(lensConfig.attributes)) {
      const durationError = findInvalidDurationFormat(config, useGASchemas);
      if (durationError) {
        throw new Error(durationError);
      }
    }

    const attributes = isLensAPIFormat(lensConfig.attributes)
      ? builder.fromAPIFormat(lensConfig.attributes)
      : lensConfig.attributes;
    const { state, references } = extractLensReferences({
      ...lensConfig,
      attributes,
    });

    return {
      state,
      references: [...references, ...drilldownReferences],
    } satisfies LensByValueTransformInResult;
  };
};
