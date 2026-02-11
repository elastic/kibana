/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredDatasourceStates } from '@kbn/lens-common';
import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import type { DatatableVisualizationState, TagcloudState, XYState } from '../../../../../public';
import type { LensAttributes } from '../../../../../server/content_management/v1/types';
import { convertXYToRawColorMappings, type DeprecatedColorMappingsXYState } from './xy';
import type { DeprecatedColorMappingLensPartitionVisualizationState } from './partition';
import { convertPieToRawColorMappings } from './partition';
import {
  convertDatatableToRawColorMappings,
  type DeprecatedColorMappingsDatatableState,
} from './datatable';
import {
  convertTagcloudToRawColorMappings,
  type DeprecatedColorMappingTagcloudState,
} from './tagcloud';

export function convertToRawColorMappingsFn(attributes: LensAttributes): LensAttributes {
  if (
    !attributes.state ||
    (attributes.visualizationType !== 'lnsXY' &&
      attributes.visualizationType !== 'lnsPie' &&
      attributes.visualizationType !== 'lnsDatatable' &&
      attributes.visualizationType !== 'lnsTagcloud')
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
  state: LensAttributes['state'] & {
    visualization?: unknown;
    datasourceStates?: unknown;
  }
): LensAttributes['state'] {
  if (!state?.visualization) return state.visualization;

  const datasourceStates = state.datasourceStates as StructuredDatasourceStates | undefined;

  if (visualizationType === 'lnsXY') {
    const visState = state.visualization as XYState | DeprecatedColorMappingsXYState;
    return convertXYToRawColorMappings(visState, datasourceStates);
  }

  if (visualizationType === 'lnsPie') {
    const visState = state.visualization as
      | LensPartitionVisualizationState
      | DeprecatedColorMappingLensPartitionVisualizationState;
    return convertPieToRawColorMappings(visState, datasourceStates);
  }

  if (visualizationType === 'lnsDatatable') {
    const visState = state.visualization as
      | DatatableVisualizationState
      | DeprecatedColorMappingsDatatableState;
    return convertDatatableToRawColorMappings(visState, datasourceStates);
  }

  if (visualizationType === 'lnsTagcloud') {
    const visState = state.visualization as TagcloudState | DeprecatedColorMappingTagcloudState;
    return convertTagcloudToRawColorMappings(visState, datasourceStates);
  }

  return state.visualization;
}
