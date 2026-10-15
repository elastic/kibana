/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LonLat {
  lon: number;
  lat: number;
}

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lonToX = (lon: number): number => (lon + 180) / 360;

export const latToY = (lat: number): number => {
  const clamped = clamp(lat, -85.05112878, 85.05112878);
  const rad = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
};

export const yToLat = (y: number): number => {
  const n = Math.PI - 2 * Math.PI * y;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const parseGeotileKey = (key: string): { z: number; x: number; y: number } | undefined => {
  const parts = key.split('/');
  if (parts.length !== 3) {
    return undefined;
  }
  const [z, x, y] = parts.map(Number);
  if (![z, x, y].every((value) => Number.isInteger(value) && value >= 0) || z > 29) {
    return undefined;
  }
  const n = 2 ** z;
  if (x >= n || y >= n) {
    return undefined;
  }
  return { z, x, y };
};

export const geotileBounds = ({ z, x, y }: { z: number; x: number; y: number }): GeoBounds => {
  const n = 2 ** z;
  return {
    west: (x / n) * 360 - 180,
    east: ((x + 1) / n) * 360 - 180,
    north: yToLat(y / n),
    south: yToLat((y + 1) / n),
  };
};

export const extendBounds = (current: GeoBounds | undefined, next: GeoBounds): GeoBounds => {
  if (!current) {
    return next;
  }
  return {
    west: Math.min(current.west, next.west),
    south: Math.min(current.south, next.south),
    east: Math.max(current.east, next.east),
    north: Math.max(current.north, next.north),
  };
};

export const padBounds = (bounds: GeoBounds, fraction = 0.08): GeoBounds => {
  const lonSpan = Math.max(bounds.east - bounds.west, 0.5);
  const latSpan = Math.max(bounds.north - bounds.south, 0.5);
  return {
    west: clamp(bounds.west - lonSpan * fraction, -180, 180),
    east: clamp(bounds.east + lonSpan * fraction, -180, 180),
    south: clamp(bounds.south - latSpan * fraction, -85, 85),
    north: clamp(bounds.north + latSpan * fraction, -85, 85),
  };
};
