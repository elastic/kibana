/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isRuntimeField } from './is_runtime_field';

/**
 * Type guard for runtime mappings
 *
 * @param {unknown} arg - The item to be checked
 * @returns {arg is RuntimeMappings}
 */
export function isRuntimeMappings(arg: unknown): arg is RuntimeMappings {
  return isPopulatedObject(arg) && Object.values(arg).every((d) => isRuntimeField(d));
}

/**
 * Alias for `estypes.MappingRuntimeFields`.
 */
export type RuntimeMappings = estypes.MappingRuntimeFields;
