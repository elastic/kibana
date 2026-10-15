/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import type { NamedColor } from '@elastic/isomer-sdk';
import { type MapGeometry, projectRegions, REGION_KEY } from '../geometry';
import { createMapModel } from '../model';
import { MAP_SLOT_ATTR } from '../slot';
import type { MapNode } from '../types';

const TONE: Record<string, string> = {
  danger: '#bd271e',
  risk: '#da8b45',
  warning: '#d6bf57',
  success: '#209280',
  primary: '#0077cc',
  accent: '#9170b8',
  neutral: '#343741',
};

// Literal paints throughout: a stylesheet does not reach inside an inline svg, and a rasterizer may not resolve
// custom properties.
const PAINT = {
  water: '#e8eef6',
  land: '#f7f9fc',
  border: '#c9d2df',
  regionLine: '#ffffff',
  markerLine: '#ffffff',
  text: '#1d2a3e',
};

const toneFill = (tone: NamedColor): string => TONE[tone] ?? TONE.neutral!;

/** Draws the map in one inline svg: an outline basemap, regions, cells, arcs, and markers, in that order. */
export const createMapReactRenderer =
  (geometry: MapGeometry) =>
  (node: MapNode): ReactNode => {
    const model = createMapModel(node);
    const { width, height, project } = model;
    const world = geometry.world_countries;
    const land = world
      ? projectRegions(world, REGION_KEY.world_countries, project, width, height)
      : [];
    const regionGeometry = node.regionSet ? geometry[node.regionSet] : undefined;
    const regionShapes =
      regionGeometry && node.regionSet
        ? new Map(
            projectRegions(regionGeometry, REGION_KEY[node.regionSet], project, width, height).map(
              ({ code, path }) => [code, path]
            )
          )
        : undefined;
    const maxCell = model.cells.reduce((max, cell) => Math.max(max, cell.value), 0) || 1;
    return (
      <div aria-label={model.ariaLabel} {...{ [MAP_SLOT_ATTR]: '' }}>
        {model.label ? <div style={{ fontWeight: 600, marginBottom: 8 }}>{model.label}</div> : null}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={model.ariaLabel}
          style={{ display: 'block', borderRadius: 4 }}
        >
          <rect width={width} height={height} fill={PAINT.water} />
          {model.tiles.map((tile) => (
            <image
              key={`${tile.col}-${tile.row}`}
              href={tile.src}
              x={tile.left}
              y={tile.top}
              width={tile.width}
              height={tile.height}
              preserveAspectRatio="none"
            />
          ))}
          {land.map(({ code, path }, index) => (
            <path
              key={`land-${code}-${index}`}
              d={path}
              fill={PAINT.land}
              stroke={PAINT.border}
              strokeWidth={0.6}
            />
          ))}
          {regionShapes
            ? model.regions.map((region) => {
                const path = regionShapes.get(region.code);
                return path ? (
                  <path
                    key={`region-${region.code}`}
                    d={path}
                    fill={region.fill ?? toneFill(region.tone ?? 'primary')}
                    fillOpacity={0.75}
                    stroke={PAINT.regionLine}
                    strokeWidth={0.6}
                  />
                ) : null;
              })
            : null}
          {model.cells.map((cell) => (
            <rect
              key={cell.key}
              x={cell.left}
              y={cell.top}
              width={cell.width}
              height={cell.height}
              fill={cell.fill ?? toneFill('primary')}
              fillOpacity={cell.fill ? 0.75 : 0.15 + (cell.value / maxCell) * 0.55}
            />
          ))}
          {model.arcs.map((arc, index) => (
            <path
              key={`arc-${index}`}
              d={arc.path}
              fill="none"
              stroke={toneFill(arc.tone)}
              strokeWidth={Math.max(1.5, Math.min(arc.weight, 4))}
            />
          ))}
          {model.markers.map((marker) => (
            <circle
              key={marker.id}
              cx={marker.x}
              cy={marker.y}
              r={marker.radius}
              fill={marker.fill ?? toneFill(marker.tone)}
              stroke={PAINT.markerLine}
              strokeWidth={1}
            />
          ))}
          {model.markers.map((marker) =>
            marker.label ? (
              <text
                key={`${marker.id}-label`}
                x={marker.x + marker.radius + 3}
                y={marker.y + 4}
                fontSize={11}
                fill={PAINT.text}
              >
                {marker.label}
              </text>
            ) : null
          )}
        </svg>
        {model.regions.length > 0 && !regionShapes ? (
          <div>
            {model.regions.slice(0, 8).map((region) => (
              <div key={region.code}>
                {region.label ?? region.code} {region.value}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };
