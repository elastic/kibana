/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';

export interface GeoPointValue {
  lat: unknown;
  lon: unknown;
}

export function normalizeGeoPointsInObject(
  obj: Record<string, unknown>,
  geoPointFields: Set<string>
): Record<string, unknown> {
  function normalizeRecursive(current: unknown, path = ''): unknown {
    if (!isPlainObject(current)) {
      return current;
    }

    const result: Record<string, unknown> = {};
    const processedKeys = new Set<string>();
    const currentObj = current as Record<string, unknown>;

    for (const [key, value] of Object.entries(currentObj)) {
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
          isPlainObject(value) &&
          'lat' in (value as Record<string, unknown>) &&
          'lon' in (value as Record<string, unknown>)
        ) {
          const v = value as GeoPointValue;
          result[key] = { lat: v.lat, lon: v.lon };
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

        if (geoPointFields.has(basePath) && siblingKey in currentObj) {
          const siblingVal = currentObj[siblingKey];

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

      if (isPlainObject(value)) {
        result[key] = normalizeRecursive(value, currentPath);
      } else {
        result[key] = value;
      }

      processedKeys.add(key);
    }

    return result;
  }

  return normalizeRecursive(obj) as Record<string, unknown>;
}

export function buildGeoPointExistsQuery(fieldName: string) {
  return {
    bool: {
      should: [
        { exists: { field: fieldName } },
        {
          bool: {
            filter: [
              { exists: { field: `${fieldName}.lat` } },
              { exists: { field: `${fieldName}.lon` } },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}

export function rebuildGeoPointsFromFlattened(
  flattenedSource: Record<string, unknown>,
  fieldDefinitionKeys: string[],
  geoPointFields: Set<string>
): Record<string, unknown> {
  const filteredEntries = Object.entries(flattenedSource).filter(([k]) => {
    if (k === '@timestamp') return true;

    if (fieldDefinitionKeys.includes(k)) return true;

    const latMatch = k.match(/^(.+)\.lat$/);
    const lonMatch = k.match(/^(.+)\.lon$/);
    if (
      (latMatch && geoPointFields.has(latMatch[1])) ||
      (lonMatch && geoPointFields.has(lonMatch[1]))
    ) {
      return true;
    }

    return false;
  });

  const sourceWithGeoPoints: Record<string, unknown> = {};
  const processedGeoFields = new Set<string>();

  for (const [key, value] of filteredEntries) {
    const latMatch = key.match(/^(.+)\.lat$/);
    const lonMatch = key.match(/^(.+)\.lon$/);

    if (latMatch && geoPointFields.has(latMatch[1])) {
      const baseField = latMatch[1];
      if (!processedGeoFields.has(baseField)) {
        const lonKey = `${baseField}.lon`;
        const lonValue = flattenedSource[lonKey];
        if (lonValue !== undefined) {
          sourceWithGeoPoints[baseField] = { lat: value, lon: lonValue };
          processedGeoFields.add(baseField);
        }
      }
    } else if (lonMatch && geoPointFields.has(lonMatch[1])) {
      const baseField = lonMatch[1];
      if (!processedGeoFields.has(baseField)) {
        const latKey = `${baseField}.lat`;
        const latValue = flattenedSource[latKey];
        if (latValue !== undefined) {
          sourceWithGeoPoints[baseField] = { lat: latValue, lon: value };
          processedGeoFields.add(baseField);
        }
      }
    } else {
      sourceWithGeoPoints[key] = value;
    }
  }

  return sourceWithGeoPoints;
}
