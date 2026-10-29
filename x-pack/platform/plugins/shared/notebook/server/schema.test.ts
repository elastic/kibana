/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition, NotebookAttributes } from '../common/types';
import {
  MAX_CELLS,
  MAX_LENS_ATTRIBUTES_LENGTH,
  MAX_TITLE_LENGTH,
  notebookAttributesSchema,
} from './schema';

const toNotebook = (cells: CellDefinition[]): NotebookAttributes => ({
  title: 'Web traffic',
  description: 'Logs sample',
  cellOrder: cells.map(({ id }) => id),
  cells: Object.fromEntries(cells.map((cell) => [cell.id, cell])),
});

const everyVariant = toNotebook([
  {
    id: 'time',
    name: 'time',
    type: 'input',
    input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: true },
  },
  {
    id: 'country',
    name: 'country',
    type: 'input',
    input: { kind: 'dropdown', optionsQuery: 'FROM logs | STATS BY geo.src', defaultValue: null },
  },
  {
    id: 'bytes',
    name: 'bytes',
    type: 'input',
    input: { kind: 'range', min: 0, max: 20000, step: 100, defaultValue: [10, 500] },
  },
  {
    id: 'visits',
    name: 'visits',
    type: 'esql',
    runMode: 'auto',
    query: 'FROM logs | WHERE ?country IS NULL OR geo.src == ?country | STATS c = COUNT()',
  },
  {
    id: 'chart',
    name: 'chart',
    type: 'chart',
    runMode: 'manual',
    sourceCell: null,
    lensAttributes: null,
  },
  { id: 'notes', name: 'notes', type: 'markdown', content: '# Instructions' },
]);

const lensAttributes = {
  title: '',
  visualizationType: 'lnsXY',
  state: { datasourceStates: { textBased: { layers: { l1: { columns: [{ columnId: 'c' }] } } } } },
  references: [],
};

const withChart = (chartLensAttributes: object) => ({
  ...everyVariant,
  cells: {
    ...everyVariant.cells,
    chart: {
      ...everyVariant.cells.chart,
      sourceCell: 'visits',
      lensAttributes: chartLensAttributes,
    },
  },
});

describe('notebookAttributesSchema', () => {
  it('accepts every cell type and input kind unchanged', () => {
    expect(notebookAttributesSchema.validate(everyVariant)).toEqual(everyVariant);
  });

  it('stores a Lens attributes blob whole', () => {
    const notebook = withChart(lensAttributes);
    expect(notebookAttributesSchema.validate(notebook).cells.chart).toEqual(notebook.cells.chart);
  });

  const manyCells = toNotebook(
    Array.from({ length: MAX_CELLS + 1 }, (_, index) => ({
      id: `md${index}`,
      name: `md${index}`,
      type: 'markdown' as const,
      content: '',
    }))
  );

  it.each([
    [
      'an unknown cell type',
      {
        ...everyVariant,
        cells: { ...everyVariant.cells, notes: { id: 'notes', name: 'notes', type: 'js' } },
      },
      /"type" to be one of/,
    ],
    ['an unknown attribute', { ...everyVariant, layout: {} }, /\[layout\]/],
    [
      'an oversized title',
      { ...everyVariant, title: 'x'.repeat(MAX_TITLE_LENGTH + 1) },
      /\[title\]/,
    ],
    ['too many ordered cells', manyCells, /\[cellOrder\]/],
    ['too many stored cells', { ...manyCells, cellOrder: [] }, /\[cells\]/],
    [
      'an oversized Lens blob',
      withChart({ title: 'x'.repeat(MAX_LENS_ATTRIBUTES_LENGTH) }),
      /lensAttributes must serialize/,
    ],
    [
      'a range default that is not a pair',
      {
        ...everyVariant,
        cells: {
          ...everyVariant.cells,
          bytes: {
            id: 'bytes',
            name: 'bytes',
            type: 'input',
            input: { kind: 'range', min: 0, max: 1, defaultValue: [1, 2, 3] },
          },
        },
      },
      /\[cells\.bytes\.input\.defaultValue\]/,
    ],
    [
      'a cellOrder that misses a cell',
      { ...everyVariant, cellOrder: everyVariant.cellOrder.slice(1) },
      /exactly the ids in cells/,
    ],
    [
      'a duplicated cellOrder id',
      { ...everyVariant, cellOrder: [...everyVariant.cellOrder, 'time'] },
      /duplicate/,
    ],
    [
      'a cell stored under another id',
      {
        ...everyVariant,
        cells: { ...everyVariant.cells, notes: { ...everyVariant.cells.visits } },
      },
      /does not match its cell id/,
    ],
  ])('rejects %s', (_label, attributes, reason) => {
    expect(() => notebookAttributesSchema.validate(attributes)).toThrow(reason);
  });
});
