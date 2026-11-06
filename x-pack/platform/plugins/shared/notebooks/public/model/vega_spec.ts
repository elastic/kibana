/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import hjson from 'hjson';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { Spec } from 'vega';
import type { TopLevelSpec } from 'vega-lite';

/** The dataset a Vega cell's source results are injected as. */
export const VEGA_TABLE_DATASET = 'table';

const VEGA_LITE_SCHEMA = 'https://vega.github.io/schema/vega-lite/v6.json';

export type VegaRecord = Record<string, string | number | boolean | null>;

export type ParsedVegaSpec =
  | { language: 'vega-lite'; spec: TopLevelSpec }
  | { language: 'vega'; spec: Spec };

/** The HJSON or JSON spec text as Vega-Lite or Vega, told apart by its `$schema`, or why it can't be read. */
export const parseVegaSpec = (text: string): ParsedVegaSpec | { error: string } => {
  let parsed: TopLevelSpec | Spec;
  try {
    parsed = hjson.parse(text, { legacyRoot: false });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'The spec must be an object' };
  }
  const schemaUrl = typeof parsed.$schema === 'string' ? parsed.$schema : '';
  return schemaUrl.includes('vega-lite')
    ? { language: 'vega-lite', spec: parsed as TopLevelSpec }
    : { language: 'vega', spec: parsed as Spec };
};

/** The table's rows as records keyed by column name, the shape Vega datasets take. */
export const toVegaRecords = ({ columns, rows }: Datatable): VegaRecord[] =>
  rows.map((row) => Object.fromEntries(columns.map(({ id, name }) => [name, row[id] ?? null])));

/**
 * The spec with the records injected as the `table` dataset. A Vega-Lite spec without data of its
 * own reads it by default; a Vega spec gets it filled into a `table` entry that has no source.
 */
export const injectVegaTable = (parsed: ParsedVegaSpec, records: VegaRecord[]): ParsedVegaSpec => {
  if (parsed.language === 'vega-lite') {
    const { spec } = parsed;
    return {
      language: 'vega-lite',
      spec: {
        ...spec,
        data: spec.data ?? { name: VEGA_TABLE_DATASET },
        datasets: { ...spec.datasets, [VEGA_TABLE_DATASET]: records },
      },
    };
  }
  const data = parsed.spec.data ?? [];
  const hasTable = data.some(({ name }) => name === VEGA_TABLE_DATASET);
  return {
    language: 'vega',
    spec: {
      ...parsed.spec,
      data: hasTable
        ? data.map((entry) =>
            entry.name === VEGA_TABLE_DATASET &&
            !('values' in entry) &&
            !('url' in entry) &&
            !('source' in entry)
              ? { ...entry, values: records }
              : entry
          )
        : [{ name: VEGA_TABLE_DATASET, values: records }, ...data],
    },
  };
};

const isNumeric = (type: string): boolean => type === 'number';

/** A Vega-Lite bar chart of the table's first category against its first number, to start from. */
export const createStarterSpec = ({ columns }: Datatable): string => {
  const measure = columns.find(({ meta }) => isNumeric(meta.type));
  const category = columns.find((column) => column !== measure);
  const encoding: Record<string, { field?: string; type: string; aggregate?: string }> = {};
  if (category) {
    encoding.x = {
      field: category.name,
      type: category.meta.type === 'date' ? 'temporal' : 'nominal',
    };
  }
  encoding.y = measure
    ? { field: measure.name, type: 'quantitative' }
    : { type: 'quantitative', aggregate: 'count' };
  return JSON.stringify(
    {
      $schema: VEGA_LITE_SCHEMA,
      data: { name: VEGA_TABLE_DATASET },
      mark: { type: 'bar', tooltip: true },
      encoding,
    },
    null,
    2
  );
};
