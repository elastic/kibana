/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ChartType } from '@kbn/visualization-utils';
import type {
  CellDefinition,
  ChartCellDefinition,
  EsqlCellDefinition,
  InputCellDefinition,
  NotebookAttributes,
} from '../../common/types';
import { suggestChart, type NotebookChartType } from '../charts/lens_helpers';
import { getQueryParamNames } from '../model/references';
import type { ParamMap, RunQuery } from '../model/types';

const TIME_FILTER = '| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
const COUNTRY_FILTER = '| WHERE ?country IS NULL OR geo.src == ?country';
const OS_FILTER = '| WHERE ?os IS NULL OR machine.os.keyword == ?os';
const BYTES_FILTER =
  '| WHERE (?bytes_min IS NULL OR bytes >= ?bytes_min) AND (?bytes_max IS NULL OR bytes <= ?bytes_max)';

const lines = (...parts: string[]): string => parts.join('\n');

const INSTRUCTIONS = `### [Logs] Web Traffic, as a notebook

This notebook recreates the **[Logs] Web Traffic** sample dashboard with ES|QL.

- **One query feeds many charts.** \`kpis\` runs once and fans out to the four metric charts.
- **Inputs are named params.** \`country\` binds \`?country\`, \`os\` binds \`?os\`, and \`bytes\` binds \`?bytes_min\` / \`?bytes_max\`. Empty inputs bind \`null\`, so each query says \`?x IS NULL OR …\`.
- **Only affected cells re-run.** Change \`os\` and only \`kpis\` and \`extensions\` (and their charts) run again. The time picker in the header feeds every query through \`?_tstart\` / \`?_tend\`.`;

interface EsqlSpec {
  name: string;
  query: string;
}

interface ChartSpec {
  name: string;
  source: string;
  chartType: NotebookChartType;
  columns?: string[];
}

const QUERIES: EsqlSpec[] = [
  {
    name: 'kpis',
    query: lines(
      'FROM kibana_sample_data_logs',
      TIME_FILTER,
      COUNTRY_FILTER,
      OS_FILTER,
      '| STATS visits = COUNT(*), unique_visitors = COUNT_DISTINCT(clientip),',
      '    c4xx = COUNT(*) WHERE response.keyword >= "400" AND response.keyword < "500",',
      '    c5xx = COUNT(*) WHERE response.keyword >= "500"',
      '| EVAL pct_4xx = ROUND(100.0 * c4xx / visits, 2), pct_5xx = ROUND(100.0 * c5xx / visits, 2)',
      '| KEEP visits, unique_visitors, pct_4xx, pct_5xx'
    ),
  },
  {
    name: 'extensions',
    query: lines(
      'FROM kibana_sample_data_logs',
      TIME_FILTER,
      OS_FILTER,
      '| WHERE extension.keyword != ""',
      '| STATS visits = COUNT(*), unique_visitors = COUNT_DISTINCT(clientip), avg_bytes = ROUND(AVG(bytes)) BY extension = extension.keyword',
      '| SORT visits DESC',
      '| LIMIT 10'
    ),
  },
  {
    name: 'urls',
    query: lines(
      'FROM kibana_sample_data_logs',
      TIME_FILTER,
      COUNTRY_FILTER,
      '| STATS visits = COUNT(*), unique_visitors = COUNT_DISTINCT(clientip) BY url = url.keyword',
      '| SORT visits DESC',
      '| LIMIT 10'
    ),
  },
  {
    name: 'bytes_histogram',
    query: lines(
      'FROM kibana_sample_data_logs',
      TIME_FILTER,
      BYTES_FILTER,
      '| STATS requests = COUNT(*) BY bucket = BUCKET(bytes, 1000)',
      '| SORT bucket',
      // A string label makes Lens use the bucket as the x-axis instead of a second metric.
      '| EVAL bytes = CONCAT(TO_STRING(TO_LONG(bucket)), " B")',
      '| KEEP bytes, requests'
    ),
  },
  {
    name: 'responses_over_time',
    query: lines(
      'FROM kibana_sample_data_logs',
      TIME_FILTER,
      COUNTRY_FILTER,
      '| STATS requests = COUNT(*) BY timestamp = BUCKET(@timestamp, 50, ?_tstart, ?_tend), response = response.keyword',
      '| SORT timestamp'
    ),
  },
];

const CHARTS: ChartSpec[] = [
  { name: 'visits', source: 'kpis', chartType: ChartType.Metric, columns: ['visits'] },
  {
    name: 'unique_visitors',
    source: 'kpis',
    chartType: ChartType.Metric,
    columns: ['unique_visitors'],
  },
  { name: 'pct_4xx', source: 'kpis', chartType: ChartType.Metric, columns: ['pct_4xx'] },
  { name: 'pct_5xx', source: 'kpis', chartType: ChartType.Metric, columns: ['pct_5xx'] },
  { name: 'extensions_table', source: 'extensions', chartType: ChartType.Table },
  { name: 'urls_table', source: 'urls', chartType: ChartType.Table },
  { name: 'bytes_chart', source: 'bytes_histogram', chartType: ChartType.Bar },
  { name: 'responses_chart', source: 'responses_over_time', chartType: ChartType.Bar },
];

const OPTIONS_QUERY = (field: string) =>
  lines('FROM kibana_sample_data_logs', TIME_FILTER, `| STATS BY ${field}`, '| LIMIT 500');

const INPUTS: Array<Omit<InputCellDefinition, 'id'>> = [
  {
    name: 'time',
    type: 'input',
    input: { kind: 'time', defaultValue: { from: 'now-7d/d', to: 'now' }, pinned: true },
  },
  {
    name: 'country',
    type: 'input',
    input: { kind: 'dropdown', optionsQuery: OPTIONS_QUERY('geo.src'), defaultValue: null },
  },
  {
    name: 'os',
    type: 'input',
    input: {
      kind: 'dropdown',
      optionsQuery: OPTIONS_QUERY('machine.os.keyword'),
      defaultValue: null,
    },
  },
  {
    name: 'bytes',
    type: 'input',
    input: { kind: 'range', min: 0, max: 20000, step: 100, defaultValue: null },
  },
];

export interface BuildDemoNotebookDeps {
  runQuery: RunQuery;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  /** Params for the default inputs: resolved `_tstart`/`_tend`, everything else `null`. */
  defaultParams: ParamMap;
}

const bindParams = (query: string, defaults: ParamMap): ParamMap =>
  Object.fromEntries(getQueryParamNames(query).map((name) => [name, defaults[name] ?? null]));

/** Builds the Logs Web Traffic demo, pre-suggesting each chart over the columns it shows. */
export const buildDemoNotebook = async ({
  runQuery,
  lens,
  dataViews,
  defaultParams,
}: BuildDemoNotebookDeps): Promise<NotebookAttributes> => {
  const markdown: CellDefinition = {
    id: uuidv4(),
    name: 'instructions',
    type: 'markdown',
    content: INSTRUCTIONS,
  };
  const inputs: CellDefinition[] = INPUTS.map((input) => ({ ...input, id: uuidv4() }));
  const queries: EsqlCellDefinition[] = QUERIES.map(({ name, query }) => ({
    id: uuidv4(),
    name,
    type: 'esql',
    runMode: 'auto',
    query,
  }));
  const queriesByName = new Map(queries.map((cell) => [cell.name, cell]));

  const tables = new Map(
    await Promise.all(
      queries.map(async ({ name, query }) => {
        const { table } = await runQuery({
          query,
          params: bindParams(query, defaultParams),
          signal: new AbortController().signal,
        });
        return [name, table] as const;
      })
    )
  );

  const charts: ChartCellDefinition[] = await Promise.all(
    CHARTS.map(async ({ name, source, chartType, columns }) => {
      const sourceCell = queriesByName.get(source);
      const table = tables.get(source);
      const lensAttributes =
        sourceCell && table
          ? await suggestChart({
              lens,
              dataViews,
              query: sourceCell.query,
              chartType,
              table: columns
                ? { ...table, columns: table.columns.filter(({ id }) => columns.includes(id)) }
                : table,
            })
          : undefined;
      return {
        id: uuidv4(),
        name,
        type: 'chart',
        runMode: 'auto',
        sourceCell: sourceCell?.id ?? null,
        lensAttributes: lensAttributes ?? null,
      };
    })
  );

  const chartsBySource = (source: string) =>
    charts.filter((chart) => chart.sourceCell === queriesByName.get(source)?.id);
  const ordered: CellDefinition[] = [
    markdown,
    ...inputs,
    ...queries.flatMap((query) => [query, ...chartsBySource(query.name)]),
  ];

  return {
    title: '[Logs] Web Traffic',
    description: 'The Logs Web Traffic sample dashboard rebuilt as a reactive ES|QL notebook.',
    cellOrder: ordered.map(({ id }) => id),
    cells: Object.fromEntries(ordered.map((cell) => [cell.id, cell])),
  };
};
