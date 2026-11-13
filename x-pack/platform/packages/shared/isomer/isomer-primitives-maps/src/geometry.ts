/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Projector } from './model';
import type { MapRegionSet } from './types';

/** A GeoJSON feature collection of polygons, as EMS boundary files are. */
export interface RegionFeatureCollection {
  type: 'FeatureCollection';
  features: ReadonlyArray<{
    properties?: Record<string, unknown> | null;
    geometry?: { type: string; coordinates: unknown } | null;
  }>;
}

/**
 * Boundary files by EMS id, supplied by the host; the pack ships none. A host may fill it in before a render, so
 * a map can name any file.
 */
export type MapGeometry = Partial<Record<MapRegionSet, RegionFeatureCollection>>;

/** The property a region's `code` matches in the EMS files the pack knows, as Kibana Maps' joins use it. */
export const REGION_KEY: Record<string, string> = {
  world_countries: 'iso2',
  usa_states: 'name',
  france_departments: 'label_en',
  uk_subdivisions: 'label_en',
};

/** The property a region's code matches: the node's `regionKey`, else the file's known key, else `name`. */
export const regionKeyOf = ({ regionSet, regionKey }: { regionSet?: string; regionKey?: string }) =>
  regionKey ?? (regionSet ? REGION_KEY[regionSet] : undefined) ?? 'name';

type Ring = ReadonlyArray<readonly [number, number]>;

const polygonsOf = ({ type, coordinates }: { type: string; coordinates: unknown }): Ring[][] =>
  type === 'Polygon'
    ? [coordinates as Ring[]]
    : type === 'MultiPolygon'
    ? (coordinates as Ring[][])
    : [];

/**
 * Each feature as one SVG path in plot pixels: rings off the plot are dropped and points are rounded to whole
 * pixels, so a world file becomes a few hundred kilobytes of markup rather than megabytes.
 */
export const projectRegions = (
  collection: RegionFeatureCollection,
  key: string,
  project: Projector,
  width: number,
  height: number
): Array<{ code: string; path: string }> =>
  collection.features.flatMap(({ properties, geometry }) => {
    if (!geometry) {
      return [];
    }
    const rings = polygonsOf(geometry)
      .flat()
      .map((ring) => {
        const points: Array<[number, number]> = [];
        for (const [lon, lat] of ring) {
          const { x, y } = project(lon, lat);
          const point: [number, number] = [Math.round(x), Math.round(y)];
          const last = points[points.length - 1];
          if (!last || last[0] !== point[0] || last[1] !== point[1]) {
            points.push(point);
          }
        }
        return points;
      })
      .filter(
        (points) =>
          points.length > 2 &&
          points.some(([x, y]) => x >= -width && x <= 2 * width && y >= -height && y <= 2 * height)
      );
    if (rings.length === 0) {
      return [];
    }
    return [
      {
        code: String(properties?.[key] ?? ''),
        path: rings.map((points) => `M${points.map(([x, y]) => `${x},${y}`).join('L')}Z`).join(''),
      },
    ];
  });
