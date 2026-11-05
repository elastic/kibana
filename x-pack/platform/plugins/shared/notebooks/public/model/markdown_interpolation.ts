/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { CellDefinition } from '../../common/types';
import { getCellOutputs } from './references';
import type { CellRuntime } from './types';

/** A value a note can show, with its Elasticsearch type when known. */
export interface MarkdownValue {
  value: unknown;
  type?: string;
}

/** What `{{…}}` references resolve against. */
export interface MarkdownScope {
  /** Input values and code exports by name. */
  params: Readonly<Record<string, MarkdownValue>>;
  /** ES|QL results by output name; undefined while the cell has none. */
  tables: Readonly<Record<string, Datatable | undefined>>;
}

export interface InterpolatedMarkdown {
  markdown: string;
  /** References that match no input or column, as written. */
  unknown: string[];
}

/**
 * `{{name}}` or `{{name.column}}`. Output names cannot contain dots, so everything after the first
 * one is the column, which may itself contain dots (`host.name`).
 */
const REFERENCE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)(?:\.([^{}]+?))?\s*\}\}/g;

const PENDING = '…';
const EMPTY = '—';
const MARKDOWN_SYNTAX = /[\\`*_[\]<>|~#]/g;

const escapeMarkdown = (text: string): string => text.replace(MARKDOWN_SYNTAX, '\\$&');

const formatValue = ({ value, type }: MarkdownValue): string => {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (Array.isArray(value)) {
    return value.map((item) => formatValue({ value: item, type })).join(', ');
  }
  if (typeof value === 'number') return value.toLocaleString();
  if (type === 'date' && (typeof value === 'string' || typeof value === 'number')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return escapeMarkdown(typeof value === 'object' ? JSON.stringify(value) : String(value));
};

const resolveColumn = (table: Datatable | undefined, column: string): string | undefined => {
  if (!table) return PENDING;
  const match = table.columns.find(({ name, id }) => name === column || id === column);
  if (!match) return undefined;
  const [firstRow] = table.rows;
  return firstRow ? formatValue({ value: firstRow[match.id], type: match.meta.type }) : EMPTY;
};

/** The note with each `{{…}}` replaced by its value; unknown references stay as written. */
export const interpolateMarkdown = (
  content: string,
  scope: MarkdownScope
): InterpolatedMarkdown => {
  const unknown = new Set<string>();
  const markdown = content.replace(REFERENCE, (text: string, name: string, column?: string) => {
    const resolved =
      column === undefined
        ? scope.params[name] && formatValue(scope.params[name])
        : name in scope.tables
        ? resolveColumn(scope.tables[name], column.trim())
        : undefined;
    if (resolved !== undefined) return resolved;
    unknown.add(text);
    return text;
  });
  return { markdown, unknown: [...unknown] };
};

const getReferencedNames = (content: string): Set<string> =>
  new Set([...content.matchAll(REFERENCE)].map(([, name]) => name));

/** Ids of the input, ES|QL and code cells whose outputs a note references. */
export const getReferencedCellIds = (
  content: string,
  cells: Readonly<Record<string, CellDefinition>>
): string[] => {
  const names = getReferencedNames(content);
  if (names.size === 0) return [];
  return Object.values(cells)
    .filter(
      (cell) =>
        (cell.type === 'input' || cell.type === 'esql' || cell.type === 'code') &&
        getCellOutputs(cell).some(({ name }) => names.has(name))
    )
    .map(({ id }) => id);
};

/** The values the given cells currently expose to notes. */
export const toMarkdownScope = (
  cells: readonly CellDefinition[],
  getRuntime: (id: string) => CellRuntime
): MarkdownScope => {
  const params: Record<string, MarkdownValue> = {};
  const tables: Record<string, Datatable | undefined> = {};
  cells.forEach((cell) => {
    const { output } = getRuntime(cell.id);
    if (cell.type === 'esql') {
      const [{ name }] = getCellOutputs(cell);
      tables[name] = output?.kind === 'table' ? output.table : undefined;
      return;
    }
    if (cell.type === 'code') {
      if (output?.kind !== 'code') return;
      Object.entries(output.values).forEach(([name, value]) => {
        params[name] = { value };
      });
      return;
    }
    if (cell.type !== 'input' || output?.kind !== 'input') return;
    const type = cell.input.kind === 'time' ? 'date' : undefined;
    Object.entries(output.params).forEach(([name, value]) => {
      params[name] = type ? { value, type } : { value };
    });
  });
  return { params, tables };
};
