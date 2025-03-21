/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedPersistedState } from '../../../../datasources/form_based/types';
import {
  DeprecatedColorMappingConfig,
  convertToRawColorMappings,
} from '../../../../runtime_state/converters/raw_color_mappings';
import { isDeprecatedColorMapping } from '../../../../runtime_state/converters/raw_color_mappings/converter';
import { TagcloudState } from '../../types';

/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingTagcloudState extends Omit<TagcloudState, 'colorMapping'> {
  colorMapping: DeprecatedColorMappingConfig;
}

export const convertToRawColorMappingsFn =
  (datasourceState?: FormBasedPersistedState) =>
  (state: DeprecatedColorMappingTagcloudState | TagcloudState): TagcloudState => {
    const hasDeprecatedColorMapping = state.colorMapping
      ? isDeprecatedColorMapping(state.colorMapping)
      : false;

    if (!hasDeprecatedColorMapping) return state as TagcloudState;

    const columnMeta = state.tagAccessor
      ? datasourceState?.layers?.[state.layerId]?.columns?.[state.tagAccessor]
      : null;

    return {
      ...state,
      colorMapping: state.colorMapping && convertToRawColorMappings(state.colorMapping, columnMeta),
    } satisfies TagcloudState;
  };
