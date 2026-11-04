/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellDefinition } from '../../common/types';
import { createCell, duplicateCell } from './cell_factory';

const toRecord = (cells: CellDefinition[]) =>
  Object.fromEntries(cells.map((cell) => [cell.id, cell]));

describe('createCell', () => {
  it('gives a new cell a matching label and reference name', () => {
    expect(createCell('chart', {})).toMatchObject({ name: 'chart_1', label: 'Chart 1' });
  });

  it('numbers past names already in use', () => {
    const first = createCell('esql', {});
    expect(createCell('esql', toRecord([first]))).toMatchObject({
      name: 'esql_2',
      label: 'ES|QL 2',
    });
  });
});

describe('duplicateCell', () => {
  it('renumbers a numbered label to match the new name', () => {
    const original = createCell('chart', {});
    expect(duplicateCell(original, toRecord([original]))).toMatchObject({
      name: 'chart_2',
      label: 'Chart 2',
    });
  });

  it('keeps a custom label as is', () => {
    const original = { ...createCell('chart', {}), label: 'Visits by host' };
    expect(duplicateCell(original, toRecord([original])).label).toBe('Visits by host');
  });
});
