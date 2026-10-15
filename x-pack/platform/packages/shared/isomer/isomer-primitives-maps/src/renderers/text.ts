/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMapModel } from '../model';
import type { MapNode } from '../types';

const MAX_ROWS = 12;

export const renderMapText = (node: MapNode): string => {
  const model = createMapModel(node);
  const lines: string[] = [];
  if (model.label) {
    lines.push(model.label.toUpperCase());
  }

  const rows: string[] = [];
  for (const marker of model.markers) {
    const value = marker.value != null ? `  ${marker.value}` : '';
    rows.push(`  ${marker.label ?? marker.id}${value}`);
  }
  for (const cell of model.cells) {
    rows.push(`  ${cell.key}  ${cell.value}`);
  }
  for (const region of model.regions) {
    rows.push(`  ${region.label ?? region.code}  ${region.value}`);
  }
  for (const arc of model.arcs) {
    rows.push(`  arc${arc.label ? `  ${arc.label}` : ''}`);
  }

  const shown = rows.slice(0, MAX_ROWS);
  lines.push(...shown);
  if (rows.length > MAX_ROWS) {
    lines.push(`  +${rows.length - MAX_ROWS} more`);
  }
  if (model.droppedCellCount > 0) {
    lines.push(`  (${model.droppedCellCount} cells dropped: key is not geotile z/x/y)`);
  }
  if (model.legendUnit) {
    lines.push(`  unit: ${model.legendUnit}`);
  }
  if (model.basemap?.unavailable) {
    lines.push('  (basemap unavailable)');
  }

  return lines.join('\n');
};
