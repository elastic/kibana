/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { isRecord } from './is_record';
import { stripPanelLevelKeys } from './panel_level';
import type { ProbedColumn } from './probe_columns';
import { chartTypeRegistry } from './chart_type_registry';

const FROM_SCRATCH_ATTEMPTS = 3;
const STYLE_ATTEMPTS = 2;

const INLINE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/gm;

const USEFUL_DESCRIPTION_RE =
  /(\d|default|e\.g\.|i\.e\.|example|must|between|minimum|maximum|at least|at most|up to|pixels|millisecond|factor|typical|legacy|truncat)/i;

const SLOT_KEYS = [
  'metric',
  'metrics',
  'x',
  'y',
  'rows',
  'group_by',
  'group_breakdown_by',
  'tag_by',
  'region',
  'breakdown_by',
  'layers',
] as const;

const STYLING_KEYS = new Set([
  'legend',
  'styling',
  'color',
  'apply_color_to',
  'format',
  'background_chart',
  'labels',
  'value_labels',
  'fit',
  'subtitle',
  'icon',
  'decorations',
  'appearance',
  'sampling',
  'axis',
]);

export type AuthorMessage = ['system' | 'human', string];
export type AuthorInvoker = (messages: AuthorMessage[]) => Promise<string>;

export type AuthorRequest =
  | {
      mode: 'from_scratch';
      chartType: SupportedChartType;
      nlQuery: string;
      esqlQuery: string;
      columns: ProbedColumn[];
      existingConfig?: string;
    }
  | {
      mode: 'style';
      chartType: SupportedChartType;
      compiledConfig: Record<string, unknown>;
      styleRequest: string;
    };

export type AuthorResult =
  | { config: Record<string, unknown>; authoringNote?: string }
  | { error: string };

const formatZodError = (error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

const PROPERTY_DROP = new Set(['filters', 'data_source']);

const trimSchema = (node: unknown, inProperties = false): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => trimSchema(item, inProperties));
  }
  if (!isRecord(node)) {
    return node;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$schema' || key === '$id') {
      continue;
    }
    if (inProperties && PROPERTY_DROP.has(key)) {
      continue;
    }
    if (
      key === 'description' &&
      typeof value === 'string' &&
      (value.length > 80 || !USEFUL_DESCRIPTION_RE.test(value))
    ) {
      continue;
    }
    if (!inProperties && key === 'title' && typeof value === 'string') {
      continue;
    }
    result[key] = trimSchema(value, key === 'properties');
  }
  return result;
};

const collectRefs = (node: unknown, refs: Set<string>): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, refs));
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  if (typeof node.$ref === 'string' && node.$ref.startsWith('#/$defs/')) {
    refs.add(node.$ref.slice('#/$defs/'.length));
  }
  Object.values(node).forEach((value) => collectRefs(value, refs));
};

const isEsqlAlt = (alt: unknown): boolean => {
  if (!isRecord(alt)) {
    return false;
  }
  if (typeof alt.$ref === 'string') {
    return /ESQL/i.test(alt.$ref) && !/NoESQL/i.test(alt.$ref);
  }
  return JSON.stringify(alt).includes('"esql"');
};

const resolveAlt = (
  alt: Record<string, unknown>,
  defs: Record<string, unknown>
): Record<string, unknown> => {
  if (typeof alt.$ref !== 'string' || !alt.$ref.startsWith('#/$defs/')) {
    return alt;
  }
  const resolved = defs[alt.$ref.slice('#/$defs/'.length)];
  return isRecord(resolved) ? resolved : alt;
};

const pickEsqlBranch = (schema: Record<string, unknown>): Record<string, unknown> => {
  const alts = Array.isArray(schema.anyOf)
    ? schema.anyOf
    : Array.isArray(schema.oneOf)
    ? schema.oneOf
    : undefined;
  if (!alts) {
    return schema;
  }
  const defs = isRecord(schema.$defs) ? schema.$defs : {};
  const esqlAlt = alts.find(isEsqlAlt);
  if (!esqlAlt || !isRecord(esqlAlt)) {
    return schema;
  }
  const { anyOf, oneOf, ...rest } = schema;
  return { ...rest, ...resolveAlt(esqlAlt, defs) };
};

const gcDefs = (schema: Record<string, unknown>): Record<string, unknown> => {
  if (!isRecord(schema.$defs)) {
    return schema;
  }
  const defs = schema.$defs;
  const pending = new Set<string>();
  const { $defs: _defs, ...root } = schema;
  collectRefs(root, pending);
  const used = new Set<string>();
  while (pending.size > 0) {
    const name = pending.values().next().value;
    if (name === undefined) {
      break;
    }
    pending.delete(name);
    if (used.has(name)) {
      continue;
    }
    used.add(name);
    if (isRecord(defs[name])) {
      collectRefs(defs[name], pending);
    }
  }
  const nextDefs: Record<string, unknown> = {};
  for (const name of used) {
    if (name in defs) {
      nextDefs[name] = defs[name];
    }
  }
  if (Object.keys(nextDefs).length === 0) {
    return root;
  }
  const STRUCTURAL_DEF = /layer|esql/i;
  const collapsed: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(nextDefs)) {
    collapsed[name] =
      STRUCTURAL_DEF.test(name) || JSON.stringify(def).length <= 400 ? def : { type: 'object' };
  }
  return { ...root, $defs: collapsed };
};

export const pruneJsonSchema = (schema: unknown): unknown => {
  const trimmed = trimSchema(schema);
  if (!isRecord(trimmed)) {
    return trimmed;
  }
  return gcDefs(pickEsqlBranch(trimmed));
};

const prunedSchemaFor = (chartType: SupportedChartType): unknown =>
  pruneJsonSchema(z.toJSONSchema(chartTypeRegistry[chartType].schema));

export const parseAuthoringResponse = (
  responseText: string
): { config: Record<string, unknown>; authoringNote?: string } => {
  const jsonMatches = Array.from(responseText.matchAll(INLINE_JSON_REGEX));
  const jsonText = jsonMatches.length > 0 ? jsonMatches[0][1].trim() : responseText.trim();
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Response is not a valid JSON object');
  }
  const { config, authoring_note: authoringNote } = parsed as {
    config?: unknown;
    authoring_note?: unknown;
  };
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Response must include a valid "config" object');
  }
  const normalizedNote = typeof authoringNote === 'string' ? authoringNote.trim() : '';
  return {
    config: config as Record<string, unknown>,
    ...(normalizedNote ? { authoringNote: normalizedNote } : {}),
  };
};

const columnOf = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.column === 'string' ? value.column : undefined;

const columnsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(columnOf)
    .filter((name): name is string => name !== undefined);
};

const collectSlotColumns = (config: Record<string, unknown>): Record<string, unknown> => {
  const slots: Record<string, unknown> = {
    metric: columnOf(config.metric),
    metrics: columnsOf(config.metrics),
    x: columnOf(config.x),
    y: Array.isArray(config.y) ? columnsOf(config.y) : columnOf(config.y),
    rows: columnsOf(config.rows),
    group_by: columnsOf(config.group_by),
    group_breakdown_by: columnsOf(config.group_breakdown_by),
    tag_by: columnOf(config.tag_by),
    region: columnOf(config.region),
    breakdown_by: columnOf(config.breakdown_by),
  };
  if (isRecord(config.metric)) {
    slots.metric_min = columnOf(config.metric.min);
    slots.metric_max = columnOf(config.metric.max);
    slots.metric_goal = columnOf(config.metric.goal);
  }
  if (Array.isArray(config.layers)) {
    slots.layers = config.layers.map((layer) =>
      isRecord(layer) ? collectSlotColumns(layer) : {}
    );
  }
  return slots;
};

const collectDataSources = (
  config: Record<string, unknown>
): Array<{ type?: unknown; query?: unknown }> => {
  const sources: Array<{ type?: unknown; query?: unknown }> = [];
  const add = (value: unknown): void => {
    if (!isRecord(value) || !isRecord(value.data_source)) {
      return;
    }
    sources.push({ type: value.data_source.type, query: value.data_source.query });
  };
  add(config);
  if (Array.isArray(config.layers)) {
    for (const layer of config.layers) {
      add(layer);
    }
  }
  return sources;
};

const restoreDataSources = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void => {
  if (isRecord(source.data_source)) {
    target.data_source = structuredClone(source.data_source);
  }
  if (!Array.isArray(target.layers) || !Array.isArray(source.layers)) {
    return;
  }
  const limit = Math.min(target.layers.length, source.layers.length);
  for (let i = 0; i < limit; i++) {
    if (isRecord(target.layers[i]) && isRecord(source.layers[i])) {
      restoreDataSources(target.layers[i], source.layers[i]);
    }
  }
};

const restoreColumn = (target: unknown, source: unknown): void => {
  if (isRecord(target) && isRecord(source) && typeof source.column === 'string') {
    target.column = source.column;
  }
};

const restoreColumnList = (target: unknown, source: unknown): void => {
  if (!Array.isArray(target) || !Array.isArray(source)) {
    return;
  }
  const limit = Math.min(target.length, source.length);
  for (let i = 0; i < limit; i++) {
    restoreColumn(target[i], source[i]);
  }
};

const restoreSlotColumns = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void => {
  restoreColumn(target.metric, source.metric);
  restoreColumn(target.breakdown_by, source.breakdown_by);
  restoreColumn(target.tag_by, source.tag_by);
  restoreColumn(target.region, source.region);
  restoreColumn(target.x, source.x);
  restoreColumn(target.y, source.y);
  restoreColumnList(target.metrics, source.metrics);
  restoreColumnList(target.rows, source.rows);
  restoreColumnList(target.group_by, source.group_by);
  restoreColumnList(target.group_breakdown_by, source.group_breakdown_by);
  if (Array.isArray(target.layers) && Array.isArray(source.layers)) {
    const limit = Math.min(target.layers.length, source.layers.length);
    for (let i = 0; i < limit; i++) {
      if (isRecord(target.layers[i]) && isRecord(source.layers[i])) {
        restoreSlotColumns(target.layers[i], source.layers[i]);
      }
    }
  }
  if (isRecord(target.metric) && isRecord(source.metric)) {
    restoreColumn(target.metric.min, source.metric.min);
    restoreColumn(target.metric.max, source.metric.max);
    restoreColumn(target.metric.goal, source.metric.goal);
  }
};

const identitiesMatch = (
  compiled: Record<string, unknown>,
  authored: Record<string, unknown>
): boolean =>
  compiled.type === authored.type &&
  JSON.stringify(collectDataSources(compiled)) === JSON.stringify(collectDataSources(authored)) &&
  JSON.stringify(collectSlotColumns(compiled)) === JSON.stringify(collectSlotColumns(authored));

const stripNonStylingDrift = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void => {
  for (const key of Object.keys(target)) {
    if (key === 'type' || key === 'data_source' || SLOT_KEYS.includes(key as (typeof SLOT_KEYS)[number])) {
      continue;
    }
    if (STYLING_KEYS.has(key)) {
      continue;
    }
    if (!(key in source)) {
      delete target[key];
      continue;
    }
    target[key] = structuredClone(source[key]);
  }
};

export const enforceStyleBound = (
  compiled: Record<string, unknown>,
  authored: Record<string, unknown>
): AuthorResult => {
  if (!identitiesMatch(compiled, authored)) {
    return { error: 'Style output changed type, data_source, or bound columns.' };
  }
  const next = structuredClone(authored);
  next.type = compiled.type;
  restoreDataSources(next, compiled);
  restoreSlotColumns(next, compiled);
  stripNonStylingDrift(next, compiled);
  return { config: next };
};

const listColumns = (columns: ProbedColumn[]): string =>
  columns.map((column) => `- "${column.name}" (${column.type})`).join('\n');

const fromScratchMessages = (
  request: Extract<AuthorRequest, { mode: 'from_scratch' }>,
  previousError: string
): AuthorMessage[] => {
  const schemaJson = JSON.stringify(prunedSchemaFor(request.chartType));
  const existing = request.existingConfig
    ? `\nExisting configuration:\n${request.existingConfig}`
    : '';
  const retry = previousError ? `\nPrevious error: ${previousError}` : '';
  return [
    [
      'system',
      `Author a ${request.chartType} Lens configuration.
Request: ${request.nlQuery}
ES|QL: ${request.esqlQuery}
Columns:
${listColumns(request.columns)}
Schema:
${schemaJson}${existing}${retry}
Return only a markdown JSON block {"authoring_note":"one sentence","config":{...}}.
Omit data_source.`,
    ],
    ['human', 'Generate the visualization configuration.'],
  ];
};

const styleMessages = (
  request: Extract<AuthorRequest, { mode: 'style' }>,
  previousError: string
): AuthorMessage[] => {
  const schemaJson = JSON.stringify(prunedSchemaFor(request.chartType));
  const retry = previousError ? `\nPrevious error: ${previousError}` : '';
  return [
    [
      'system',
      `Adjust styling of this compiled ${request.chartType} config.
Request: ${request.styleRequest}
Compiled config:
${JSON.stringify(request.compiledConfig)}
Schema:
${schemaJson}${retry}
Do not change type, data_source, or bound columns.
Return only a markdown JSON block {"authoring_note":"one sentence","config":{...}}.`,
    ],
    ['human', 'Apply the styling request.'],
  ];
};

const withPlaceholderDataSource = (config: Record<string, unknown>): Record<string, unknown> => {
  const next = structuredClone(config);
  if (Array.isArray(next.layers)) {
    for (const layer of next.layers) {
      if (isRecord(layer) && layer.data_source === undefined) {
        layer.data_source = { type: 'esql', query: '' };
      }
    }
    return next;
  }
  if (next.data_source === undefined) {
    next.data_source = { type: 'esql', query: '' };
  }
  return next;
};

const validateAuthoredConfig = (
  chartType: SupportedChartType,
  config: Record<string, unknown>
): string | undefined => {
  const stripped = stripPanelLevelKeys(withPlaceholderDataSource(config));
  const parsed = chartTypeRegistry[chartType].schema.safeParse(stripped.config);
  return parsed.success ? undefined : formatZodError(parsed.error);
};

export const author = async (
  request: AuthorRequest,
  invoke: AuthorInvoker
): Promise<AuthorResult> => {
  switch (request.mode) {
    case 'from_scratch':
    case 'style': {
      const attempts = request.mode === 'from_scratch' ? FROM_SCRATCH_ATTEMPTS : STYLE_ATTEMPTS;
      let lastError = '';
      for (let attempt = 0; attempt < attempts; attempt++) {
        const messages =
          request.mode === 'from_scratch'
            ? fromScratchMessages(request, lastError)
            : styleMessages(request, lastError);
        try {
          const parsed = parseAuthoringResponse(await invoke(messages));
          const schemaError = validateAuthoredConfig(request.chartType, parsed.config);
          if (schemaError) {
            lastError = schemaError;
            continue;
          }
          if (request.mode === 'style') {
            const bound = enforceStyleBound(request.compiledConfig, parsed.config);
            if ('error' in bound) {
              return bound;
            }
            return {
              config: bound.config,
              ...(parsed.authoringNote ? { authoringNote: parsed.authoringNote } : {}),
            };
          }
          return parsed;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
      return { error: lastError || 'Failed to author a valid configuration.' };
    }
    default: {
      const exhaustive: never = request;
      return exhaustive;
    }
  }
};
