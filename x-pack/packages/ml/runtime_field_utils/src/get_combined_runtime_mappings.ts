/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { isRuntimeMappings, type RuntimeMappings } from './is_runtime_mappings';

/**
 * Return a map of runtime_mappings for each of the data view field provided
 * to provide in ES search queries
 * @param {DataView | undefined} dataView - The Kibana data view.
 * @param runtimeMappings - Optional runtime mappings.
 */
export function getCombinedRuntimeMappings(
  dataView: DataView | undefined,
  runtimeMappings?: RuntimeMappings
): RuntimeMappings | undefined {
  let combinedRuntimeMappings = Object.create(null);

  // Add runtime field mappings defined by index pattern
  if (dataView) {
    const computedFields = dataView?.getComputedFields();
    if (computedFields?.runtimeFields !== undefined) {
      const dataViewRuntimeMappings = computedFields.runtimeFields;
      if (isRuntimeMappings(dataViewRuntimeMappings)) {
        combinedRuntimeMappings = { ...combinedRuntimeMappings, ...dataViewRuntimeMappings };
      }
    }
  }

  // Use runtime field mappings defined inline from API
  // and override fields with same name from index pattern
  if (isRuntimeMappings(runtimeMappings)) {
    combinedRuntimeMappings = { ...combinedRuntimeMappings, ...runtimeMappings };
  }

  if (isRuntimeMappings(combinedRuntimeMappings)) {
    return combinedRuntimeMappings;
  }
}
