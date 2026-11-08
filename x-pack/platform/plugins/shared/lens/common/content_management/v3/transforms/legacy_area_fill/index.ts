/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYVisualizationState } from '@kbn/lens-common';
import type { LensAttributesV2 } from '../../../v2';
import type { LensAttributesV3 } from '../types';
import { convertAreaFillDefaultFn } from './xy';

export function convertAreaFillDefault<T extends LensAttributesV2 | LensAttributesV3>(
  attributes: T,
  areaFill: NonNullable<XYVisualizationState['areaFill']>
): T {
  if (attributes.visualizationType !== 'lnsXY' || !attributes.state?.visualization) {
    return attributes;
  }

  return {
    ...attributes,
    state: {
      ...(attributes.state as Record<string, unknown>),
      visualization: convertAreaFillDefaultFn(
        attributes.state.visualization as XYVisualizationState,
        areaFill
      ),
    },
  };
}
