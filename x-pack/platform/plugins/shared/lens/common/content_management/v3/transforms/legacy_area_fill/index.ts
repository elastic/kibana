/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYVisualizationState } from '@kbn/lens-common';
import { LENS_ITEM_VERSION_V3 } from '@kbn/lens-common/content_management/constants';
import type { LensAttributesV2 } from '../../../v2';
import type { LensAttributesV3 } from '../types';
import { convertToLegacyAreaFillFn } from './xy';

export function convertToLegacyAreaFill<T extends LensAttributesV2 | LensAttributesV3>(
  attributes: T
): T {
  if ((attributes.version ?? 0) >= LENS_ITEM_VERSION_V3) return attributes;

  if (attributes.visualizationType === 'lnsXY' && attributes.state?.visualization) {
    return {
      ...attributes,
      state: {
        ...(attributes.state as Record<string, unknown>),
        visualization: convertToLegacyAreaFillFn(
          attributes.state.visualization as XYVisualizationState
        ),
      },
    };
  }
  return attributes;
}
