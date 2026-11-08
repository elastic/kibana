/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ROW_HEIGHT, DEFAULT_GRID_GAP, GRID_SUBDIVISIONS } from '../common/constants';
import { MAX_GRID_UNITS, type StoredNotebookAttributes } from './schema';

/** The row height apps used before model version 3, in pixels. */
const LEGACY_APP_ROW_HEIGHT = 40;

type StoredApp = NonNullable<StoredNotebookAttributes['panels']>[number];

/**
 * The app with its panels' rows converted from the legacy row height to the current one, so each
 * panel keeps its size in pixels. Edges are rounded to whole rows, or to the fine grid when the app
 * doesn't snap, so panels that touched still touch.
 */
const scaleApp = (app: StoredApp): StoredApp => {
  const gap = app.gridGap ?? DEFAULT_GRID_GAP;
  const ratio = (LEGACY_APP_ROW_HEIGHT + gap) / (APP_ROW_HEIGHT + gap);
  const steps = app.snapToGrid ?? true ? 1 : GRID_SUBDIVISIONS;
  const toSteps = (rows: number) =>
    Math.min(Math.round(rows * ratio * steps), MAX_GRID_UNITS * steps);
  return {
    ...app,
    panels: app.panels.map((panel) => {
      const top = toSteps(panel.y);
      const bottom = Math.max(top + 1, toSteps(panel.y + panel.height));
      return { ...panel, y: top / steps, height: (bottom - top) / steps };
    }),
  };
};

/** The notebook with every app's panel rows converted to the current row height. */
export const scaleAppRows = (attributes: StoredNotebookAttributes): StoredNotebookAttributes =>
  attributes.panels ? { ...attributes, panels: attributes.panels.map(scaleApp) } : attributes;
