/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalizes geo_point fields in a nested object before flattening.
 * Converts flattened lat/lon properties into a single geo_point object { lat, lon }.
 * Preserves WKT strings and already-normalized objects.
 *
 * @param obj - The nested object to normalize
 * @param geoPointFields - Set of field paths that are known to be geo_point type
 * @returns Normalized object with geo_point fields as { lat, lon } objects
 */
export function normalizeGeoPointsInObject(
  obj: Record<string, any>,
  geoPointFields: Set<string>
): Record<string, any> {
  function normalizeRecursive(current: any, path: string = ''): any {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return current;
    }

    const result: Record<string, any> = {};
    const processedKeys = new Set<string>();

    for (const [key, value] of Object.entries(current)) {
      if (processedKeys.has(key)) continue;

      const currentPath = path ? `${path}.${key}` : key;

      // Check if this is a geo_point field that might have .lat and .lon
      if (geoPointFields.has(currentPath)) {
        // If it's already a string (WKT), keep it
        if (typeof value === 'string') {
          result[key] = value;
          processedKeys.add(key);
          continue;
        }

        // If it's already an object with lat/lon, keep it
        if (
          typeof value === 'object' &&
          value !== null &&
          'lat' in value &&
          'lon' in value &&
          !Array.isArray(value)
        ) {
          result[key] = { lat: value.lat, lon: value.lon };
          processedKeys.add(key);
          continue;
        }

        // Check if we have separate .lat and .lon properties at parent level
        const latKey = `${key}.lat`;
        const lonKey = `${key}.lon`;
        if (latKey in current && lonKey in current) {
          const lat = current[latKey];
          const lon = current[lonKey];
          if (typeof lat === 'number' && typeof lon === 'number') {
            result[key] = { lat, lon };
            processedKeys.add(latKey);
            processedKeys.add(lonKey);
            continue;
          }
        }
      }

      // Recurse into nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = normalizeRecursive(value, currentPath);
      } else {
        result[key] = value;
      }
      processedKeys.add(key);
    }

    return result;
  }

  return normalizeRecursive(obj);
}
