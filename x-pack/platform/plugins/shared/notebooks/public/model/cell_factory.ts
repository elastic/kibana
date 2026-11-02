/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CellDefinition, CellType, InputKind, NotebookAttributes } from '../../common/types';

export type NewCellKind = Exclude<CellType, 'input'> | `input:${InputKind}`;

interface CellBlueprint {
  namePrefix: string;
  build: (base: { id: string; name: string }, sourceCell: string | null) => CellDefinition;
}

const BLUEPRINTS: Record<NewCellKind, CellBlueprint> = {
  esql: {
    namePrefix: 'query',
    build: (base) => ({ ...base, type: 'esql', runMode: 'auto', query: '' }),
  },
  chart: {
    namePrefix: 'chart',
    build: (base, sourceCell) => ({
      ...base,
      type: 'chart',
      runMode: 'auto',
      sourceCell,
      lensAttributes: null,
    }),
  },
  markdown: {
    namePrefix: 'notes',
    build: (base) => ({ ...base, type: 'markdown', content: '' }),
  },
  'input:time': {
    namePrefix: 'period',
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: false },
    }),
  },
  'input:dropdown': {
    namePrefix: 'choice',
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'dropdown', optionsQuery: '', defaultValue: null },
    }),
  },
  'input:range': {
    namePrefix: 'range',
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'range', min: 0, max: 100, defaultValue: null },
    }),
  },
};

export const getUniqueName = (prefix: string, cells: Record<string, CellDefinition>): string => {
  const taken = new Set(Object.values(cells).map(({ name }) => name));
  let index = 1;
  while (taken.has(`${prefix}_${index}`)) index++;
  return `${prefix}_${index}`;
};

export const createCell = (
  kind: NewCellKind,
  cells: Record<string, CellDefinition>,
  sourceCell: string | null = null
): CellDefinition => {
  const { namePrefix, build } = BLUEPRINTS[kind];
  return build({ id: uuidv4(), name: getUniqueName(namePrefix, cells) }, sourceCell);
};

export const duplicateCell = (
  cell: CellDefinition,
  cells: Record<string, CellDefinition>
): CellDefinition => ({
  ...cell,
  id: uuidv4(),
  name: getUniqueName(cell.name.replace(/_\d+$/, ''), cells),
});

/** A new notebook starts with one pinned time input, `now-7d/d` → `now`. */
export const createEmptyNotebook = (title: string): NotebookAttributes => {
  const time: CellDefinition = {
    id: uuidv4(),
    name: 'time',
    type: 'input',
    input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: true },
  };
  return { title, cellOrder: [time.id], cells: { [time.id]: time } };
};
