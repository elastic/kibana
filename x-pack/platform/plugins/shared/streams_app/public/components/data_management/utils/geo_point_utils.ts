/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import type { NamedFieldDefinitionConfig } from '@kbn/streams-schema';

/**
 * Converts flattened geo_point fields (field.lat, field.lon) back to WKT format
 * for display in the UI. Only applies to fields that are defined as geo_point type.
 *
 * @param record - The flattened record with potential .lat and .lon fields
 * @param fields - Array of field definitions to identify geo_point fields
 * @returns Record with geo_point fields converted to WKT format (POINT(lon lat))
 */
export function regroupGeoPointFieldsForDisplay(
  record: FlattenRecord,
  fields: NamedFieldDefinitionConfig[]
): FlattenRecord {
  const result: FlattenRecord = { ...record };
  const geoPointFields = new Set(
    fields.filter((field) => field.type === 'geo_point').map((field) => field.name)
  );

  // Track which geo_point fields we've processed
  const processedFields = new Set<string>();

  for (const [key, value] of Object.entries(record)) {
    // Check if this is a .lat field for a geo_point
    const latMatch = key.match(/^(.+)\.lat$/);
    if (latMatch) {
      const baseField = latMatch[1];
      if (geoPointFields.has(baseField) && !processedFields.has(baseField)) {
        const lonKey = `${baseField}.lon`;
        const lonValue = record[lonKey];

        if (lonValue !== undefined && typeof value === 'number' && typeof lonValue === 'number') {
          // Convert to WKT format: POINT(lon lat)
          result[baseField] = `POINT(${lonValue} ${value})`;
          delete result[key];
          delete result[lonKey];
          processedFields.add(baseField);
        }
      }
    }
  }

  return result;
}
