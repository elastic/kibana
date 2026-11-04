/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Geometry, Position } from 'geojson';

// Maps draws with MapLibre's `globeInterpolate` projection (Kibana's default map setting): a globe
// seen in perspective, which turns into Web Mercator between zoom 0 and 9. This mirrors MapLibre's
// vertical perspective globe (`vertical_perspective_transform.ts`) and its `fitBounds`.

type Vector = readonly [number, number, number];

/** A longitude/latitude box, like the maps plugin's `MapExtent`. */
export interface MapExtent {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Where the camera looks and how large the globe is drawn. */
export interface GlobeView {
  width: number;
  height: number;
  centerLon: number;
  centerLat: number;
  zoom: number;
  /** Globe radius in pixels. */
  radius: number;
  /** Distance from the camera to the map center in pixels. */
  cameraDistance: number;
}

const RADIANS = Math.PI / 180;
const TILE_SIZE = 512;
// MapLibre's default 36.87° field of view puts the camera 1.5 viewport heights from the center.
const CAMERA_DISTANCE_FACTOR = 0.5 / Math.tan((36.8698976 / 2) * RADIANS);
const MAX_MERCATOR_LATITUDE = 85.051129;
const MIN_ZOOM = 0;
const MAX_ZOOM = 24;
// `FIT_TO_BOUNDS_SCALE_FACTOR` and the `fitBounds` padding of the maps plugin.
const FIT_TO_BOUNDS_SCALE_FACTOR = 0.1;
const FIT_PADDING = 16;
// The maps container's view before any data arrives (`mb_map.tsx`).
const INITIAL_BOUNDS: MapExtent = { minLon: -170, minLat: -60, maxLon: 170, maxLat: 75 };
// Longest edge, in degrees, drawn without splitting it.
const MAX_SEGMENT_DEGREES = 1;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const mercatorY = (lat: number): number =>
  Math.log(
    Math.tan(
      Math.PI / 4 + (clamp(lat, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE) * RADIANS) / 2
    )
  );

const latFromMercatorY = (y: number): number => Math.atan(Math.sinh(y)) / RADIANS;

// MapLibre's `differenceOfAnglesDegrees`.
const differenceOfAngles = (a: number, b: number): number => {
  const from = ((a % 360) + 360) % 360;
  const to = ((b % 360) + 360) % 360;
  const diff1 = to - from;
  const diff2 = to > from ? diff1 - 360 : diff1 + 360;
  return Math.abs(diff1) < Math.abs(diff2) ? diff1 : diff2;
};

const wrapAngle = (angle: number): number =>
  angle > Math.PI ? angle - 2 * Math.PI : angle < -Math.PI ? angle + 2 * Math.PI : angle;

const forEachPosition = (geometry: Geometry, callback: (position: Position) => void): void => {
  switch (geometry.type) {
    case 'Point':
      callback(geometry.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      geometry.coordinates.forEach(callback);
      break;
    case 'MultiLineString':
    case 'Polygon':
      geometry.coordinates.forEach((line) => line.forEach(callback));
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach(callback)));
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach((child) => forEachPosition(child, callback));
      break;
  }
};

/** The bounding box of geometries (`turf/bbox`), or undefined when there are none. */
export const getGeometryBounds = (geometries: readonly Geometry[]): MapExtent | undefined => {
  const bounds = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  geometries.forEach((geometry) =>
    forEachPosition(geometry, ([lon, lat]) => {
      bounds.minLon = Math.min(bounds.minLon, lon);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLon = Math.max(bounds.maxLon, lon);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
    })
  );
  return Number.isFinite(bounds.minLon) ? bounds : undefined;
};

const toZoom = (radius: number, lat: number): number =>
  Math.log2((radius * 2 * Math.PI * Math.cos(lat * RADIANS)) / TILE_SIZE);

const toRadius = (zoom: number, lat: number): number =>
  (TILE_SIZE * 2 ** zoom) / (2 * Math.PI) / Math.cos(lat * RADIANS);

// The unit vector of a location in a frame where the view center is (0, 0, 1) and north is up.
const toViewVector = (lon: number, lat: number, centerLon: number, centerLat: number): Vector => {
  const lambda = (lon - centerLon) * RADIANS;
  const phi = lat * RADIANS;
  const phi0 = centerLat * RADIANS;
  return [
    Math.cos(phi) * Math.sin(lambda),
    Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda),
    Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda),
  ];
};

// The Web Mercator `fitBounds` center (MapLibre's `cameraForBoxAndBearing`).
const getMercatorFit = (
  { minLon, minLat, maxLon, maxLat }: MapExtent,
  width: number,
  height: number,
  padding: number
): { centerLon: number; centerLat: number; zoom: number } => {
  const top = mercatorY(maxLat);
  const bottom = mercatorY(minLat);
  const scale = Math.min(
    (width - 2 * padding) / ((maxLon - minLon) / 360),
    (height - 2 * padding) / ((top - bottom) / (2 * Math.PI))
  );
  return {
    centerLon: (minLon + maxLon) / 2,
    centerLat: latFromMercatorY((top + bottom) / 2),
    zoom: Math.log2(scale / TILE_SIZE),
  };
};

const createView = (
  width: number,
  height: number,
  centerLon: number,
  centerLat: number,
  zoom: number
): GlobeView => {
  const clampedZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  return {
    width,
    height,
    centerLon,
    centerLat,
    zoom: clampedZoom,
    radius: toRadius(clampedZoom, centerLat),
    cameraDistance: CAMERA_DISTANCE_FACTOR * height,
  };
};

// The globe radius that fits the bounds, as MapLibre's globe `cameraForBoxAndBearing` solves it:
// the globe is scaled about the view center until the bounds' corners and edge midpoints touch
// the padded viewport.
const getGlobeFitRadius = (
  bounds: MapExtent,
  centerLon: number,
  centerLat: number,
  width: number,
  height: number,
  cameraDistance: number
): number | undefined => {
  const flip = differenceOfAngles(bounds.minLon, bounds.maxLon) < 0;
  const west = flip ? bounds.maxLon : bounds.minLon;
  const east = flip ? bounds.minLon : bounds.maxLon;
  const north = Math.max(bounds.minLat, bounds.maxLat);
  const south = Math.min(bounds.minLat, bounds.maxLat);
  const midLon = west + differenceOfAngles(west, east) * 0.5;
  const midLat = north + differenceOfAngles(north, south) * 0.5;
  const testPoints: ReadonlyArray<[number, number]> = [
    [bounds.minLon, bounds.maxLat],
    [bounds.maxLon, bounds.maxLat],
    [bounds.minLon, bounds.minLat],
    [bounds.maxLon, bounds.minLat],
    [east, midLat],
    [west, midLat],
    [midLon, north],
    [midLon, south],
  ];
  const edgeX = width / 2 - FIT_PADDING;
  const edgeY = height / 2 - FIT_PADDING;
  let radius = Infinity;
  for (const [lon, lat] of testPoints) {
    const [x, y, z] = toViewVector(lon, lat, centerLon, centerLat);
    // A point at radius r projects to `D·r·x / (D + r·(1 − z))`; solve for the edge.
    for (const [edge, coordinate] of [
      [-edgeX, x],
      [edgeX, x],
      [-edgeY, y],
      [edgeY, y],
    ]) {
      const solved = (edge * cameraDistance) / (cameraDistance * coordinate - edge * (1 - z));
      if (solved > 0 && solved < radius) {
        radius = solved;
      }
    }
  }
  return Number.isFinite(radius) ? radius : undefined;
};

/**
 * The view the maps plugin ends up with for a layer with these data bounds: `scaleBounds` by 10%,
 * then `fitBounds` with 16px padding on the globe. Without bounds (no joined features), the view
 * stays where the map starts.
 */
export const fitGlobeView = (
  dataBounds: MapExtent | undefined,
  width: number,
  height: number
): GlobeView => {
  const initial = getMercatorFit(INITIAL_BOUNDS, width, height, 0);
  const initialView = createView(width, height, initial.centerLon, initial.centerLat, initial.zoom);
  if (!dataBounds) {
    return initialView;
  }
  const lonPadding = (dataBounds.maxLon - dataBounds.minLon) * FIT_TO_BOUNDS_SCALE_FACTOR;
  const latPadding = (dataBounds.maxLat - dataBounds.minLat) * FIT_TO_BOUNDS_SCALE_FACTOR;
  const minLon = dataBounds.minLon - lonPadding;
  const maxLon = dataBounds.maxLon + lonPadding;
  const wholeWorld = maxLon - minLon > 360;
  const bounds: MapExtent = {
    minLon: clamp(wholeWorld ? -180 : minLon, -180, 180),
    maxLon: clamp(wholeWorld ? 180 : maxLon, -180, 180),
    minLat: clamp(dataBounds.minLat - latPadding, -89, 89),
    maxLat: clamp(dataBounds.maxLat + latPadding, -89, 89),
  };
  const { centerLon, centerLat } = getMercatorFit(bounds, width, height, FIT_PADDING);
  const cameraDistance = CAMERA_DISTANCE_FACTOR * height;
  const radius = getGlobeFitRadius(bounds, centerLon, centerLat, width, height, cameraDistance);
  return radius === undefined
    ? initialView
    : createView(width, height, centerLon, centerLat, toZoom(radius, centerLat));
};

/** SVG path data of polygons on the globe; empty strings when they are on the far side. */
export interface GlobePolygonPaths {
  /** The area to fill, clipped to the visible side of the globe (even-odd fill rule). */
  fill: string;
  /** The rings to stroke, without the stretches the globe outline hides. */
  stroke: string;
}

/** Projects locations of a view to pixels, with the far side of the globe hidden. */
export interface GlobeProjector {
  view: GlobeView;
  /** Radius of the globe's outline in pixels, around the viewport center. */
  outlineRadius: number;
  polygonPaths(geometry: Geometry): GlobePolygonPaths;
}

/** Creates the projector of a view; `tolerance` is the pixel distance under which points merge. */
export const createGlobeProjector = (view: GlobeView, tolerance = 0.5): GlobeProjector => {
  const { width, height, centerLon, centerLat, radius, cameraDistance } = view;
  const cx = width / 2;
  const cy = height / 2;
  // Points with `z` above the horizon are on the side of the globe the camera sees.
  const horizon = radius / (radius + cameraDistance);
  const outlineRadius =
    (cameraDistance * radius * Math.sqrt(1 - horizon * horizon)) /
    (cameraDistance + radius * (1 - horizon));

  const project = ([x, y, z]: Vector): [number, number] => {
    const scale = (cameraDistance * radius) / (cameraDistance + radius * (1 - z));
    return [cx + scale * x, cy - scale * y];
  };
  const outlinePoint = (x: number, y: number): [number, number] => {
    const azimuth = Math.atan2(y, x);
    return [cx + outlineRadius * Math.cos(azimuth), cy - outlineRadius * Math.sin(azimuth)];
  };
  const toScreen = (vector: Vector): [number, number] =>
    vector[2] > horizon ? project(vector) : outlinePoint(vector[0], vector[1]);

  const toVectors = (ring: readonly Position[]): Vector[] => {
    const vectors: Vector[] = [];
    ring.forEach(([lon, lat], index) => {
      const previous = ring[index - 1];
      if (previous) {
        const lonStep = lon - previous[0];
        const latStep = lat - previous[1];
        const steps =
          Math.abs(lonStep) > 180
            ? 1
            : Math.ceil(Math.max(Math.abs(lonStep), Math.abs(latStep)) / MAX_SEGMENT_DEGREES);
        for (let step = 1; step < steps; step++) {
          vectors.push(
            toViewVector(
              previous[0] + (lonStep * step) / steps,
              previous[1] + (latStep * step) / steps,
              centerLon,
              centerLat
            )
          );
        }
      }
      vectors.push(toViewVector(lon, lat, centerLon, centerLat));
    });
    return vectors;
  };

  const toPathData = (points: ReadonlyArray<[number, number]>, closed: boolean): string => {
    const kept: Array<[number, number]> = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((point, index) => {
      const last = kept[kept.length - 1];
      const isEnd = !closed && index === points.length - 1;
      if (!last || isEnd || Math.hypot(point[0] - last[0], point[1] - last[1]) >= tolerance) {
        kept.push(point);
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
      }
    });
    if (kept.length < (closed ? 3 : 2) || maxX < 0 || minX > width || maxY < 0 || minY > height) {
      return '';
    }
    return `M${kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${
      closed ? 'Z' : ''
    }`;
  };

  const fullOutline = (): string =>
    toPathData(
      Array.from({ length: 64 }, (_, index) => {
        const angle = (index / 64) * 2 * Math.PI;
        return outlinePoint(Math.cos(angle), Math.sin(angle));
      }),
      true
    );

  // Hidden stretches of a ring are pushed onto the globe outline at their azimuth, which traces
  // the outline between where the ring leaves and re-enters the visible side.
  const ringPaths = (ring: readonly Position[]): GlobePolygonPaths => {
    const vectors = toVectors(ring);
    if (!vectors.some(([, , z]) => z > horizon)) {
      return { fill: '', stroke: '' };
    }
    const points: Array<[number, number]> = [toScreen(vectors[0])];
    const strokeRuns: Array<Array<[number, number]>> = [vectors[0][2] > horizon ? [points[0]] : []];
    let winding = 0;
    let zSum = vectors[0][2];
    for (let index = 1; index < vectors.length; index++) {
      const previous = vectors[index - 1];
      const current = vectors[index];
      const isVisible = current[2] > horizon;
      if (previous[2] > horizon !== isVisible) {
        const t = (horizon - previous[2]) / (current[2] - previous[2]);
        const crossing = outlinePoint(
          previous[0] + t * (current[0] - previous[0]),
          previous[1] + t * (current[1] - previous[1])
        );
        points.push(crossing);
        if (isVisible) {
          strokeRuns.push([crossing]);
        } else {
          strokeRuns[strokeRuns.length - 1].push(crossing);
        }
      }
      const point = toScreen(current);
      points.push(point);
      if (isVisible) {
        strokeRuns[strokeRuns.length - 1].push(point);
      }
      winding += wrapAngle(
        Math.atan2(current[1], current[0]) - Math.atan2(previous[1], previous[0])
      );
      zSum += current[2];
    }
    const fill = toPathData(points, true);
    // A ring around the far pole of the view also loops once around the outline; with the even-odd
    // fill rule, one more outline loop cancels it.
    const aroundFarSide = Math.abs(winding) > Math.PI && zSum < 0;
    const isWhole = strokeRuns.length === 1 && vectors.every(([, , z]) => z > horizon);
    return {
      fill: fill && aroundFarSide ? `${fill}${fullOutline()}` : fill,
      stroke: isWhole ? fill : strokeRuns.map((run) => toPathData(run, false)).join(''),
    };
  };

  const polygonPaths = (geometry: Geometry): GlobePolygonPaths => {
    const polygons =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
    const paths = polygons.flatMap((rings) => rings.map(ringPaths));
    return {
      fill: paths.map(({ fill }) => fill).join(''),
      stroke: paths.map(({ stroke }) => stroke).join(''),
    };
  };

  return { view, outlineRadius, polygonPaths };
};
