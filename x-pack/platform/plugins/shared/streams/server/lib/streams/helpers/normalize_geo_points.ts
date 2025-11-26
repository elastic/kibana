/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

      if (geoPointFields.has(currentPath)) {
        // If it's already a string (WKT), keep it
        if (typeof value === 'string') {
          result[key] = value;
          processedKeys.add(key);
          continue;
        }

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
      }

      const match = key.match(/^(.*)\.(lat|lon)$/);
      if (match) {
        const baseName = match[1];

        const suffix = match[2]; // 'lat' or 'lon'
        const siblingSuffix = suffix === 'lat' ? 'lon' : 'lat';
        const siblingKey = `${baseName}.${siblingSuffix}`;

        const basePath = path ? `${path}.${baseName}` : baseName;

        if (geoPointFields.has(basePath) && siblingKey in current) {
          const siblingVal = current[siblingKey];

          const latVal = suffix === 'lat' ? value : siblingVal;
          const lonVal = suffix === 'lon' ? value : siblingVal;

          if (latVal !== undefined && lonVal !== undefined) {
            result[baseName] = { lat: latVal, lon: lonVal };
            processedKeys.add(key);
            processedKeys.add(siblingKey);
            continue;
          }
        }
      }

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
