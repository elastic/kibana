/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { splitFlattenedApiConfig } from '@kbn/lens-common-2';
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
export const getTransformIn = (
  builder: LensConfigBuilder,
  transformDrilldownsIn: DrilldownTransforms['transformIn'],
  isDashboardAppRequest: boolean
): LensTransformIn => {
  return function transformIn(config) {
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

    const { panelState, chartConfig } = splitFlattenedApiConfig(storedConfig);

    if (!isLensAPIFormat(chartConfig)) {
      const { state, references } = extractLensReferences(storedConfig as LensSerializedState);
      return {
        state,
        references: [...references, ...drilldownReferences],
      } satisfies LensByValueTransformInResult;
    }

    const chartType = builder.getType(chartConfig);
    if (!builder.isSupported(chartType)) {
      throw new Error(`Lens "${chartType}" chart type is not supported`);
    }

    const attributes = builder.fromAPIFormat(chartConfig);

    const { state, references } = extractLensReferences({
      ...panelState,
      attributes,
    });

    return {
      state,
      references: [...references, ...drilldownReferences],
    } satisfies LensByValueTransformInResult;
  };
};
