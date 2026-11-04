/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type {
  CellDefinition,
  CellType,
  InputCellDefinition,
  InputKind,
  NotebookAttributes,
} from '../../common/types';
import { getAllOutputNames } from './references';

export type NewCellKind = Exclude<CellType, 'input'> | `input:${InputKind}`;

interface CellBlueprint {
  namePrefix: string;
  labelPrefix: string;
  build: (
    base: { id: string; name: string; label: string },
    sourceCell: string | null
  ) => CellDefinition;
}

const BLUEPRINTS: Record<NewCellKind, CellBlueprint> = {
  esql: {
    namePrefix: 'esql',
    labelPrefix: i18n.translate('xpack.notebook.cell.label.esql', { defaultMessage: 'ES|QL' }),
    build: (base) => ({ ...base, type: 'esql', runMode: 'auto', query: '' }),
  },
  chart: {
    namePrefix: 'chart',
    labelPrefix: i18n.translate('xpack.notebook.cell.label.chart', { defaultMessage: 'Chart' }),
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
    labelPrefix: i18n.translate('xpack.notebook.cell.label.markdown', { defaultMessage: 'Notes' }),
    build: (base) => ({ ...base, type: 'markdown', content: '' }),
  },
  'input:time': {
    namePrefix: 'period',
    labelPrefix: i18n.translate('xpack.notebook.cell.label.time', { defaultMessage: 'Period' }),
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: false },
    }),
  },
  'input:dropdown': {
    namePrefix: 'choice',
    labelPrefix: i18n.translate('xpack.notebook.cell.label.dropdown', { defaultMessage: 'Choice' }),
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'dropdown', optionsQuery: '', defaultValue: null },
    }),
  },
  'input:range': {
    namePrefix: 'range',
    labelPrefix: i18n.translate('xpack.notebook.cell.label.range', { defaultMessage: 'Range' }),
    build: (base) => ({
      ...base,
      type: 'input',
      input: { kind: 'range', min: 0, max: 100, defaultValue: null },
    }),
  },
};

/** The lowest number N for which `{prefix}_N` is not already a cell name. */
const getUniqueIndex = (prefix: string, cells: Record<string, CellDefinition>): number => {
  const taken = [...Object.values(cells).map(({ name }) => name), ...getAllOutputNames(cells)];
  const isTaken = (name: string) =>
    taken.some((other) => other === name || other.startsWith(`${name}_`));
  let index = 1;
  while (isTaken(`${prefix}_${index}`)) index++;
  return index;
};

export const getUniqueName = (prefix: string, cells: Record<string, CellDefinition>): string =>
  `${prefix}_${getUniqueIndex(prefix, cells)}`;

/** New cells get a matching label and name, e.g. "Chart 1" and `chart_1`. */
export const createCell = (
  kind: NewCellKind,
  cells: Record<string, CellDefinition>,
  sourceCell: string | null = null
): CellDefinition => {
  const { namePrefix, labelPrefix, build } = BLUEPRINTS[kind];
  const index = getUniqueIndex(namePrefix, cells);
  return build(
    { id: uuidv4(), name: `${namePrefix}_${index}`, label: `${labelPrefix} ${index}` },
    sourceCell
  );
};

const NUMBERED_LABEL = /^(.*) \d+$/;

/**
 * A copy with the next free name and default output names; a numbered label like "Chart 1" is
 * renumbered to match.
 */
export const duplicateCell = (
  cell: CellDefinition,
  cells: Record<string, CellDefinition>
): CellDefinition => {
  const prefix = cell.name.replace(/_\d+$/, '');
  const index = getUniqueIndex(prefix, cells);
  const labelBase = cell.label?.match(NUMBERED_LABEL)?.[1];
  const { outputNames: _renamed, ...copy } = cell;
  return {
    ...copy,
    id: uuidv4(),
    name: `${prefix}_${index}`,
    ...(labelBase !== undefined ? { label: `${labelBase} ${index}` } : {}),
  };
};

export const isPinnedTimeCell = (cell: CellDefinition): cell is InputCellDefinition =>
  cell.type === 'input' && cell.input.kind === 'time' && cell.input.pinned === true;

export const findPinnedTimeCell = (
  cells: Record<string, CellDefinition>
): InputCellDefinition | undefined => Object.values(cells).find(isPinnedTimeCell);

/** The global time picker's backing cell, exposing `?_tstart`/`?_tend` over `now-7d/d` → `now`. */
export const createPinnedTimeCell = (cells: Record<string, CellDefinition>): CellDefinition => ({
  id: uuidv4(),
  name: Object.values(cells).some(({ name }) => name === 'time')
    ? getUniqueName('time', cells)
    : 'time',
  type: 'input',
  input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: true },
});

/** A new notebook starts with the global time picker enabled. */
export const createEmptyNotebook = (title: string): NotebookAttributes => {
  const time = createPinnedTimeCell({});
  return { title, cellOrder: [time.id], cells: { [time.id]: time } };
};
