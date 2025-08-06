/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { getEcsFieldDescriptions } from './get_ecs_field_descriptions';

export function extractDimensions(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>,
  filter?: string[]
): Array<{ name: string; type: string; description?: string }> {
  const dims: Array<{ name: string; type: string; description?: string }> = [];

  // Get all dimension field names for batch description lookup
  const dimensionFieldNames = Object.entries(fields)
    .filter(([fieldName, fieldInfo]) => {
      if (fieldName === '_metric_names_hash') return false;
      return Object.values(fieldInfo).some(
        (typeInfo) =>
          typeInfo.time_series_dimension === true && (!filter || filter.includes(fieldName))
      );
    })
    .map(([fieldName]) => fieldName);

  // Get ECS and OTel descriptions for dimension fields
  // TODO: this needs to be replaed by the FieldsMetadataService
  const ecsDescriptions = getEcsFieldDescriptions(dimensionFieldNames);
  // const otelConventions = getOtelSemanticConventions(dimensionFieldNames);

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    if (fieldName === '_metric_names_hash') continue;

    for (const [type, typeInfo] of Object.entries(fieldInfo)) {
      if (typeInfo.time_series_dimension === true && (!filter || filter.includes(fieldName))) {
        // Get description from various sources (priority: field caps -> ECS -> OTel)
        const fieldCapsDescription = Array.isArray(typeInfo.meta?.description)
          ? typeInfo.meta.description.join(', ')
          : typeInfo.meta?.description;
        const ecsDescription = ecsDescriptions.get(fieldName);
        // const otelDescription = otelConventions.get(fieldName)?.brief;
        const description = fieldCapsDescription || ecsDescription;

        dims.push({
          name: fieldName,
          type,
          description,
        });
      }
    }
  }

  return dims;
}
