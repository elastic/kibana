/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYState } from '../../../../../public';
import type { LensAttributes } from '../../../../../server/content_management/v2';
import { convertToSplitAccessorsFn, type DeprecatedSplitAccessorState } from './xy';

export function convertToSplitAccessors(attributes: LensAttributes): LensAttributes {
  if (attributes.visualizationType === 'lnsXY' && attributes.state?.visualization) {
    const visState = attributes.state.visualization as XYState | DeprecatedSplitAccessorState;
    return {
      ...attributes,
      state: {
        ...(attributes.state as Record<string, unknown>),
        visualization: convertToSplitAccessorsFn(visState),
      },
    };
  }
  return attributes;
}
