/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { TagcloudState } from '../../../../../public';
import {
  convertToRawColorMappings,
  getColumnMetaFn,
  isDeprecatedColorMapping,
  type DeprecatedColorMappingConfig,
} from './common';

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingTagcloudState extends Omit<TagcloudState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

export const convertTagcloudToRawColorMappings = (
  state: TagcloudState | DeprecatedColorMappingTagcloudState,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): TagcloudState => {
  const getColumnMeta = getColumnMetaFn(datasourceStates);
  const hasDeprecatedColorMapping = state.colorMapping
    ? isDeprecatedColorMapping(state.colorMapping)
    : false;

  if (!hasDeprecatedColorMapping) return state as TagcloudState;

  const columnMeta = state.tagAccessor ? getColumnMeta?.(state.layerId, [state.tagAccessor]) : null;

  return {
    ...state,
    colorMapping: state.colorMapping && convertToRawColorMappings(state.colorMapping, columnMeta),
  } satisfies TagcloudState;
};
