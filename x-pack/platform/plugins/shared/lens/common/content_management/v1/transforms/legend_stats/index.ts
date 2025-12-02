/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import type { XYState } from '../../../../../public';
import type { LensAttributes } from '../../../../../server/content_management/v1/types';
import {
  convertPartitionToLegendStats,
  type DeprecatedLegendValueLensPartitionVisualizationState,
} from './partition';
import { convertXYToLegendStats, type DeprecatedLegendValueXYState } from './xy';

export function convertToLegendStats(attributes: LensAttributes): LensAttributes {
  if (
    !attributes.state ||
    (attributes.visualizationType !== 'lnsXY' && attributes.visualizationType !== 'lnsPie')
  ) {
    return attributes;
  }

  const newVisualizationState = getUpdatedVisualizationState(
    attributes.visualizationType,
    attributes.state as Record<string, unknown>
  );

  return {
    ...attributes,
    state: {
      ...(attributes.state as Record<string, unknown>),
      visualization: newVisualizationState,
    },
  };
}

export function getUpdatedVisualizationState(
  visualizationType: LensAttributes['visualizationType'],
  state: LensAttributes['state'] & { visualization?: unknown }
): LensAttributes['state'] {
  if (visualizationType === 'lnsXY' && state?.visualization) {
    const visState = state.visualization as XYState | DeprecatedLegendValueXYState;
    return convertXYToLegendStats(visState);
  }

  if (visualizationType === 'lnsPie' && state?.visualization) {
    const visState = state.visualization as
      | LensPartitionVisualizationState
      | DeprecatedLegendValueLensPartitionVisualizationState;
    return convertPartitionToLegendStats(visState);
  }

  return state.visualization;
}
