/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type { SchemaContext } from './field_path';
import { fieldToOttl } from './field_path';
import { conditionToOttl } from './condition_to_ottl';

export interface OttlStatement {
  statement: string;
}

export interface OttlTransformProcessor {
  name: string;
  logStatements: OttlStatement[];
}

export interface OttlFilterProcessor {
  name: string;
  signalType: string;
  errorMode: string;
  condition: string;
}

export type OttlProcessor = OttlTransformProcessor | OttlFilterProcessor;

const UNSUPPORTED_ACTIONS = new Set([
  'dissect',
  'date',
  'redact',
  'math',
  'network_direction',
  'enrich',
  'manual_ingest_pipeline',
  'append',
]);

export interface ConversionWarning {
  processor: string;
  message: string;
}

/**
 * Convert a flat array of StreamLang processor definitions to OTTL processors.
 */
export function convertProcessors(
  processors: StreamlangProcessorDefinition[],
  schemaContext: SchemaContext,
  signalType: string
): { processors: OttlProcessor[]; warnings: ConversionWarning[] } {
  const result: OttlProcessor[] = [];
  const warnings: ConversionWarning[] = [];
  let stepIndex = 0;

  for (const proc of processors) {
    const action = proc.action;

    if (UNSUPPORTED_ACTIONS.has(action)) {
      const suggestion = action === 'dissect' ? ' Use grok instead.' : '';
      warnings.push({
        processor: action,
        message: `Processor "${action}" is not supported in OTTL transpilation.${suggestion}`,
      });
      continue;
    }

    stepIndex++;
    const statements = convertProcessor(proc, schemaContext);

    if (statements.length === 0) continue;

    // drop_document becomes a filter processor
    if (action === 'drop_document') {
      const whereClause = 'where' in proc ? proc.where : undefined;
      if (!whereClause) {
        warnings.push({
          processor: action,
          message: 'drop_document requires a where clause',
        });
        continue;
      }
      result.push({
        name: `filter/${signalType}-step-${stepIndex}`,
        signalType,
        errorMode: 'ignore',
        condition: conditionToOttl(whereClause, schemaContext),
      } as OttlFilterProcessor);
      continue;
    }

    // Wrap statements with where clause if present
    const whereClause = 'where' in proc ? proc.where : undefined;
    const finalStatements = statements.map((s) => {
      if (whereClause) {
        return { statement: `${s.statement} where ${conditionToOttl(whereClause, schemaContext)}` };
      }
      return s;
    });

    result.push({
      name: `transform/step-${stepIndex}`,
      logStatements: finalStatements,
    } as OttlTransformProcessor);
  }

  return { processors: result, warnings };
}

function convertProcessor(
  proc: StreamlangProcessorDefinition,
  ctx: SchemaContext
): OttlStatement[] {
  switch (proc.action) {
    case 'set':
      return convertSet(proc, ctx);
    case 'remove':
      return convertRemove(proc, ctx);
    case 'remove_by_prefix':
      return convertRemoveByPrefix(proc, ctx);
    case 'rename':
      return convertRename(proc, ctx);
    case 'convert':
      return convertConvert(proc, ctx);
    case 'replace':
      return convertReplace(proc, ctx);
    case 'uppercase':
      return convertUppercase(proc, ctx);
    case 'lowercase':
      return convertLowercase(proc, ctx);
    case 'trim':
      return convertTrim(proc, ctx);
    case 'split':
      return convertSplit(proc, ctx);
    case 'join':
      return convertJoin(proc, ctx);
    case 'concat':
      return convertConcat(proc, ctx);
    case 'grok':
      return convertGrok(proc, ctx);
    case 'json_extract':
      return convertJsonExtract(proc, ctx);
    case 'sort':
      return convertSort(proc, ctx);
    case 'drop_document':
      return []; // handled separately as filter processor
    default:
      return [];
  }
}

function convertSet(proc: any, ctx: SchemaContext): OttlStatement[] {
  const target = fieldToOttl(proc.to, ctx);
  const value =
    typeof proc.value === 'string'
      ? `"${proc.value}"`
      : typeof proc.value === 'boolean'
        ? proc.value
          ? 'true'
          : 'false'
        : String(proc.value);
  return [{ statement: `set(${target}, ${value})` }];
}

function convertRemove(proc: any, ctx: SchemaContext): OttlStatement[] {
  const fields: string[] = Array.isArray(proc.field) ? proc.field : [proc.field];
  return fields.map((f: string) => ({
    statement: `delete_key(${parentAccessor(f, ctx)}, "${lastKey(f)}")`,
  }));
}

function convertRemoveByPrefix(proc: any, ctx: SchemaContext): OttlStatement[] {
  // OTTL doesn't have a direct prefix-delete, but we can use delete_matching_keys
  const target = fieldToOttl(proc.field, ctx);
  return [{ statement: `delete_matching_keys(${target}, "${proc.prefix}*")` }];
}

function convertRename(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = fieldToOttl(proc.to, ctx);
  return [
    { statement: `set(${to}, ${from})` },
    { statement: `delete_key(${parentAccessor(proc.from, ctx)}, "${lastKey(proc.from)}")` },
  ];
}

function convertConvert(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  const ottlType = mapConvertType(proc.type);
  return [{ statement: `set(${to}, ${ottlType}(${from}))` }];
}

function mapConvertType(type: string): string {
  switch (type) {
    case 'string':
      return 'String';
    case 'integer':
    case 'long':
      return 'Int';
    case 'float':
    case 'double':
      return 'Double';
    case 'boolean':
      return 'Bool';
    default:
      return 'String';
  }
}

function convertReplace(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  const pattern = proc.pattern.replace(/"/g, '\\"');
  const replacement = proc.replacement.replace(/"/g, '\\"');
  if (to === from) {
    return [{ statement: `replace_all_matches(${from}, "${pattern}", "${replacement}")` }];
  }
  return [
    { statement: `set(${to}, ${from})` },
    { statement: `replace_all_matches(${to}, "${pattern}", "${replacement}")` },
  ];
}

function convertUppercase(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  return [{ statement: `set(${to}, ConvertCase(${from}, "upper"))` }];
}

function convertLowercase(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  return [{ statement: `set(${to}, ConvertCase(${from}, "lower"))` }];
}

function convertTrim(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  // OTTL doesn't have Trim, use replace to strip leading/trailing whitespace
  return [{ statement: `set(${to}, TrimLeft(TrimRight(${from})))` }];
}

function convertSplit(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  const sep = proc.separator || proc.delimiter || ',';
  return [{ statement: `set(${to}, Split(${from}, "${sep}"))` }];
}

function convertJoin(proc: any, ctx: SchemaContext): OttlStatement[] {
  const to = fieldToOttl(proc.to, ctx);
  const delimiter = proc.delimiter || ', ';
  // Join multiple fields into a single string
  const fields: string[] = proc.from;
  // Concatenate using Concat function
  const accessors = fields.map((f: string) => fieldToOttl(f, ctx));
  // Use a series of Concat calls
  if (accessors.length === 1) {
    return [{ statement: `set(${to}, ${accessors[0]})` }];
  }
  // Build concatenation: Concat([field1, field2, ...], delimiter)
  return [{ statement: `set(${to}, Concat([${accessors.join(', ')}], "${delimiter}"))` }];
}

function convertConcat(proc: any, ctx: SchemaContext): OttlStatement[] {
  const to = fieldToOttl(proc.to, ctx);
  const parts: string[] = proc.from.map((part: { type: string; value: string }) => {
    if (part.type === 'literal') return `"${part.value}"`;
    return fieldToOttl(part.value, ctx);
  });
  return [{ statement: `set(${to}, Concat([${parts.join(', ')}], ""))` }];
}

function convertGrok(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.from, ctx);
  const patterns: string[] = proc.patterns;
  // ExtractGrokPatterns returns a pcommon.Map of named captures
  // We merge it into the current record
  const patternStr = patterns.map((p: string) => `"${p.replace(/"/g, '\\"')}"`).join(', ');
  // For single pattern (most common)
  if (patterns.length === 1) {
    return [
      {
        statement: `merge_maps(attributes, ExtractGrokPatterns(${from}, "${patterns[0].replace(/"/g, '\\"')}"), "upsert")`,
      },
    ];
  }
  // Multiple patterns: try each in order
  return patterns.map((pattern: string) => ({
    statement: `merge_maps(attributes, ExtractGrokPatterns(${from}, "${pattern.replace(/"/g, '\\"')}"), "upsert")`,
  }));
}

function convertJsonExtract(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.field, ctx);
  const statements: OttlStatement[] = [];
  // Parse JSON from field, then extract selectors
  for (const extraction of proc.extractions) {
    const target = fieldToOttl(extraction.target_field, ctx);
    // ParseJSON returns a map, then we access the selector path
    statements.push({
      statement: `set(${target}, ParseJSON(${from})["${extraction.selector}"])`,
    });
  }
  return statements;
}

function convertSort(proc: any, ctx: SchemaContext): OttlStatement[] {
  const from = fieldToOttl(proc.field || proc.from, ctx);
  const to = proc.to ? fieldToOttl(proc.to, ctx) : from;
  const order = proc.order === 'desc' ? '"desc"' : '"asc"';
  return [{ statement: `set(${to}, Sort(${from}, ${order}))` }];
}

// Helpers

function parentAccessor(field: string, ctx: SchemaContext): string {
  const parts = field.split('.');
  if (parts.length <= 1) {
    // Top-level field — parent is the root container
    if (ctx === 'bodymap') return 'body';
    if (field.startsWith('resource.')) return 'resource.attributes';
    return 'attributes';
  }
  const parent = parts.slice(0, -1).join('.');
  return fieldToOttl(parent, ctx);
}

function lastKey(field: string): string {
  const parts = field.split('.');
  return parts[parts.length - 1];
}
