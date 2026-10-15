/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { createMapModel } from '../model';
import type { MapNode } from '../types';

const MAX_ROWS = 12;

export const renderMapMarkdown = (node: MapNode) => {
  const model = createMapModel(node);
  const heading = model.label ? [md.paragraph(md.strong(model.label))] : [];
  const rows: Array<[string, string]> = [];

  for (const marker of model.markers) {
    rows.push([marker.label ?? marker.id, marker.value != null ? String(marker.value) : '']);
  }
  for (const cell of model.cells) {
    rows.push([cell.key, String(cell.value)]);
  }
  for (const region of model.regions) {
    rows.push([region.label ?? region.code, String(region.value)]);
  }
  for (const arc of model.arcs) {
    rows.push([arc.label ?? 'arc', arc.weight != null ? String(arc.weight) : '']);
  }

  if (rows.length === 0) {
    return [...heading, md.paragraph(md.emphasis('Empty map.'))];
  }

  return [
    ...heading,
    md.table(['place', model.legendUnit ?? 'value'], rows.slice(0, MAX_ROWS)),
    ...(rows.length > MAX_ROWS
      ? [md.paragraph(md.emphasis(`${rows.length - MAX_ROWS} more not shown.`))]
      : []),
    ...(model.droppedCellCount > 0
      ? [
          md.paragraph(
            md.emphasis(`${model.droppedCellCount} cells dropped: key is not geotile z/x/y.`)
          ),
        ]
      : []),
    ...(model.basemap?.unavailable ? [md.paragraph(md.emphasis('Basemap unavailable.'))] : []),
  ];
};
