/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';
import { isRecord, skippedResult, unescapeVegaField } from '../evaluator_utils';
import { isNumericColumn, type EsqlColumn } from './esql_column_types';
import type { EsqlQueryRunner } from './esql_query_runner';

export const COLUMN_BINDING_INTEGRITY_EVALUATOR_NAME = 'Column Binding Integrity';

export type BindingRole = 'measure' | 'dimension' | 'other';

export interface ColumnBinding {
  /** Dotted path inside the config, e.g. `layers[0].y[1]` or `spec.encoding.x`. */
  path: string;
  column: string;
  role: BindingRole;
  /** Vega field with an unescaped `.`, `[` or `]`, which Vega-Lite reads as nested access. */
  nestedVegaAccess?: boolean;
}

export type BindingStatus = 'ok' | 'missing' | 'non_numeric_measure' | 'nested_vega_access';

export interface BindingCheck extends ColumnBinding {
  status: BindingStatus;
  columnType?: string;
}

// Lens Config API keys whose ES|QL column must be numeric for the chart to render a value.
// `min` / `max` / `goal` (gauge) and `max_value` (metric background bar) nest inside a measure.
const MEASURE_KEYS = new Set(['y', 'metric', 'metrics', 'min', 'max', 'goal', 'max_value']);
// Charts where `x` / `y` are axes (buckets), not series values.
const AXIS_ONLY_CHART_TYPES = new Set(['heatmap']);
// Keys that bucket or split the data; any column type is acceptable.
const DIMENSION_KEYS = new Set([
  'x',
  'breakdown_by',
  'group_by',
  'tag_by',
  'rows',
  'columns',
  'split_metrics_by',
]);
const SKIP_KEYS = new Set(['data_source']);

const roleForKey = (key: string, chartType: string | undefined): BindingRole => {
  if (
    chartType !== undefined &&
    AXIS_ONLY_CHART_TYPES.has(chartType) &&
    (key === 'x' || key === 'y')
  ) {
    return 'dimension';
  }
  if (MEASURE_KEYS.has(key)) {
    return 'measure';
  }
  return DIMENSION_KEYS.has(key) ? 'dimension' : 'other';
};

const stripBackticks = (name: string): string => name.replace(/`/g, '');

/**
 * Every column the config binds to a chart role. Lens bindings are `{ column }`
 * objects under role keys, including ones nested inside another binding; Vega
 * bindings are `encoding.<channel>.field` on the root view and any layered or
 * concatenated view, with quantitative channels treated as measures.
 * Custom content is an HTML template and binds nothing.
 */
export function collectColumnBindings(visualization: ExtractedVisualization): ColumnBinding[] {
  const config = visualization.visualization ?? {};
  if (visualization.renderer === 'custom_content') {
    return [];
  }
  if (visualization.renderer === 'vega') {
    return collectVegaBindings(config.spec);
  }
  const chartType = (
    typeof config.type === 'string' ? config.type : visualization.chartType
  )?.toLowerCase();
  const bindings: ColumnBinding[] = [];
  walkLens(config, '', 'other', chartType, bindings);
  return bindings;
}

function walkLens(
  value: unknown,
  path: string,
  role: BindingRole,
  chartType: string | undefined,
  bindings: ColumnBinding[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkLens(item, `${path}[${index}]`, role, chartType, bindings));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  // A binding can carry further bindings (a gauge metric's `max`), so keep walking.
  if (typeof value.column === 'string' && value.column.trim().length > 0) {
    bindings.push({ path, column: value.column, role });
  }
  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }
    walkLens(child, path ? `${path}.${key}` : key, roleForKey(key, chartType), chartType, bindings);
  }
}

// Vega-Lite keys whose value is a nested view (or list of views) that carries its own encoding.
const VEGA_VIEW_KEYS = ['layer', 'concat', 'hconcat', 'vconcat', 'spec'] as const;
// Aggregates that count rows, so the field they reference may be of any type.
const VEGA_COUNTING_AGGREGATES = new Set(['count', 'distinct', 'valid', 'missing']);

// A `.`, `[` or `]` not preceded by a backslash.
const UNESCAPED_VEGA_ACCESSOR = /(^|[^\\])[.[\]]/;

const vegaRoleFor = (definition: Record<string, unknown>): BindingRole =>
  definition.type === 'quantitative' &&
  !(typeof definition.aggregate === 'string' && VEGA_COUNTING_AGGREGATES.has(definition.aggregate))
    ? 'measure'
    : 'other';

function collectVegaBindings(spec: unknown): ColumnBinding[] {
  if (typeof spec !== 'string') {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(spec);
  } catch {
    return [];
  }
  const bindings: ColumnBinding[] = [];
  walkVegaView(parsed, 'spec', bindings);
  return bindings;
}

function walkVegaView(view: unknown, path: string, bindings: ColumnBinding[]): void {
  if (!isRecord(view)) {
    return;
  }
  if (isRecord(view.encoding)) {
    for (const [channel, value] of Object.entries(view.encoding)) {
      // Channels such as `tooltip` accept an array of field definitions.
      const definitions = Array.isArray(value) ? value : [value];
      definitions.forEach((definition, index) => {
        if (!isRecord(definition) || typeof definition.field !== 'string') {
          return;
        }
        bindings.push({
          path: `${path}.encoding.${channel}${Array.isArray(value) ? `[${index}]` : ''}`,
          column: unescapeVegaField(definition.field),
          role: vegaRoleFor(definition),
          ...(UNESCAPED_VEGA_ACCESSOR.test(definition.field) ? { nestedVegaAccess: true } : {}),
        });
      });
    }
  }
  for (const key of VEGA_VIEW_KEYS) {
    const child = view[key];
    if (Array.isArray(child)) {
      child.forEach((item, index) => walkVegaView(item, `${path}.${key}[${index}]`, bindings));
    } else {
      walkVegaView(child, `${path}.${key}`, bindings);
    }
  }
}

/** Resolves each binding against the executed result columns. */
export function checkColumnBindings(
  bindings: ColumnBinding[],
  columns: EsqlColumn[]
): BindingCheck[] {
  const byName = new Map(columns.map((column) => [stripBackticks(column.name), column]));
  return bindings.map((binding) => {
    const column = byName.get(stripBackticks(binding.column));
    if (!column) {
      return { ...binding, status: 'missing' };
    }
    if (binding.nestedVegaAccess) {
      return { ...binding, status: 'nested_vega_access', columnType: column.type };
    }
    if (binding.role === 'measure' && !isNumericColumn(column)) {
      return { ...binding, status: 'non_numeric_measure', columnType: column.type };
    }
    return { ...binding, status: 'ok', columnType: column.type };
  });
}

const describeFailure = (check: BindingCheck): string => {
  switch (check.status) {
    case 'missing':
      return `${check.path}: column "${check.column}" is not in the query result`;
    case 'nested_vega_access':
      return `${check.path}: Vega field "${check.column}" is not escaped, so Vega-Lite reads it as a nested path instead of the flat column`;
    default:
      return `${check.path}: measure "${check.column}" is ${check.columnType}, not numeric`;
  }
};

/**
 * CODE evaluator: executes each visualization's ES|QL and checks that every
 * column the Lens config (or Vega encoding) binds to exists in the result, and
 * that measure roles (Lens measures, quantitative Vega channels) bind numeric
 * columns. Catches configs that parse against the schema but reference columns
 * the query never produces. A chart that binds no column at all scores 0; only
 * a Vega spec without any encoding field is left unscored.
 */
export function createColumnBindingIntegrityEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  /** Executes ES|QL; share one runner across evaluators so each query runs once. */
  runQuery: EsqlQueryRunner;
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    runQuery,
    visualizationExtractor,
    name = COLUMN_BINDING_INTEGRITY_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }): Promise<EvaluationResult> => {
      let visualizations: ExtractedVisualization[];
      try {
        visualizations = visualizationExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Visualization extractor threw: ${(err as Error).message}`,
        };
      }

      if (visualizations.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No visualization produced to check column bindings.',
        };
      }

      const details = await Promise.all(
        visualizations.map(async (visualization, index) => {
          const bindings = collectColumnBindings(visualization);
          if (bindings.length === 0) {
            // A Vega spec without encoding fields may still bind columns through
            // transforms or data-driven expressions, so it is left out of the score.
            // Anything else that binds no column at all is a broken chart, not a pass.
            const unscorable = visualization.renderer === 'vega';
            const renderer = visualization.renderer ?? 'lens';
            return {
              index,
              score: unscorable ? undefined : 0,
              checkedBindings: 0,
              resolvedBindings: 0,
              bindings: [] as BindingCheck[],
              failures: unscorable ? [] : [`${renderer} visualization binds no columns`],
              note: unscorable ? 'no encoding fields found; left to Config Validity' : undefined,
            };
          }
          try {
            const response = await runQuery(visualization.esql);
            const checks = checkColumnBindings(bindings, response.columns ?? []);
            const failures = checks.filter((check) => check.status !== 'ok').map(describeFailure);
            return {
              index,
              score: (checks.length - failures.length) / checks.length,
              checkedBindings: checks.length,
              resolvedBindings: checks.length - failures.length,
              bindings: checks,
              failures,
            };
          } catch (err) {
            return {
              index,
              score: 0,
              checkedBindings: bindings.length,
              resolvedBindings: 0,
              bindings: [] as BindingCheck[],
              failures: [`ES|QL execution failed: ${(err as Error).message}`],
            };
          }
        })
      );

      const scores = details.flatMap((detail) =>
        detail.score === undefined ? [] : [detail.score]
      );
      if (scores.length === 0) {
        return skippedResult('No column bindings to resolve (Vega spec without encoding fields).');
      }
      const score = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      const failures = details.flatMap((detail) => detail.failures);
      const checked = details.reduce((sum, detail) => sum + detail.checkedBindings, 0);
      const resolved = details.reduce((sum, detail) => sum + detail.resolvedBindings, 0);

      return {
        score,
        label: score === 1 ? 'bound' : score === 0 ? 'unbound' : 'partial',
        explanation:
          score === 1
            ? `All ${checked} column binding(s) resolve to result columns of the right kind.`
            : `${resolved}/${checked} column binding(s) resolve. ${failures.join('; ')}`,
        metadata: {
          checkedBindings: checked,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
