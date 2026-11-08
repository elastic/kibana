/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleAppRows } from './scale_app_rows';
import type { StoredNotebookAttributes } from './schema';

const notebookWith = (
  app: Partial<NonNullable<StoredNotebookAttributes['panels']>[number]>
): StoredNotebookAttributes => ({
  title: 'Notebook',
  cellOrder: [],
  cells: {},
  panels: [{ id: 'app', title: 'App 1', panels: [], ...app }],
});

const panelsOf = (attributes: StoredNotebookAttributes) => attributes.panels?.[0].panels;

describe('scaleAppRows', () => {
  it('keeps panels the same height in pixels at the default gap', () => {
    // 7 rows of 40px with 8px gaps is 328px; 12 rows of 20px with 8px gaps is also 328px.
    const scaled = scaleAppRows(
      notebookWith({ panels: [{ id: 'p', cellId: 'c', x: 0, y: 0, width: 6, height: 7 }] })
    );
    expect(panelsOf(scaled)).toEqual([{ id: 'p', cellId: 'c', x: 0, y: 0, width: 6, height: 12 }]);
  });

  it('keeps stacked panels touching after rounding', () => {
    const scaled = scaleAppRows(
      notebookWith({
        panels: [
          { id: 'top', cellId: 'a', x: 0, y: 0, width: 12, height: 2 },
          { id: 'bottom', cellId: 'b', x: 0, y: 2, width: 12, height: 3 },
        ],
      })
    );
    const [top, bottom] = panelsOf(scaled) ?? [];
    expect(top.y + top.height).toBe(bottom.y);
  });

  it('uses the app gap to work out the ratio', () => {
    // 2 rows of 40px with no gap is 80px, which is 4 rows of 20px.
    const scaled = scaleAppRows(
      notebookWith({
        gridGap: 0,
        panels: [{ id: 'p', cellId: 'c', x: 0, y: 1, width: 6, height: 2 }],
      })
    );
    expect(panelsOf(scaled)).toEqual([{ id: 'p', cellId: 'c', x: 0, y: 2, width: 6, height: 4 }]);
  });

  it('rounds to the fine grid when the app does not snap', () => {
    const scaled = scaleAppRows(
      notebookWith({
        snapToGrid: false,
        panels: [{ id: 'p', cellId: 'c', x: 0, y: 0.5, width: 6, height: 1.5 }],
      })
    );
    expect(panelsOf(scaled)).toEqual([
      { id: 'p', cellId: 'c', x: 0, y: 0.9, width: 6, height: 2.5 },
    ]);
  });

  it('leaves a notebook without apps unchanged', () => {
    const notebook: StoredNotebookAttributes = { title: 'Notebook', cellOrder: [], cells: {} };
    expect(scaleAppRows(notebook)).toBe(notebook);
  });
});
