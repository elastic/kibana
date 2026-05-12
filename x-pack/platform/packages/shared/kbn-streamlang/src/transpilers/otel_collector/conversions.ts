/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppendProcessor,
  ConcatProcessor,
  ConvertProcessor,
  DateProcessor,
  DropDocumentProcessor,
  GrokProcessor,
  JoinProcessor,
  JsonExtractProcessor,
  LowercaseProcessor,
  RedactProcessor,
  RemoveProcessor,
  RenameProcessor,
  ReplaceProcessor,
  SetProcessor,
  SplitProcessor,
  StreamlangProcessorDefinition,
  TrimProcessor,
  UppercaseProcessor,
} from '../../../types/processors';
import type { Emission } from './emission';
import { convertAppendProcessorToOtel } from './processors/append';
import { convertConcatProcessorToOtel } from './processors/concat';
import { convertConvertProcessorToOtel } from './processors/convert';
import { convertDateProcessorToOtel } from './processors/date';
import { convertDropDocumentProcessorToOtel } from './processors/drop_document';
import { convertGrokProcessorToOtel } from './processors/grok';
import { convertJoinProcessorToOtel } from './processors/join';
import { convertJsonExtractProcessorToOtel } from './processors/json_extract';
import { convertLowercaseProcessorToOtel } from './processors/lowercase';
import { convertRedactProcessorToOtel } from './processors/redact';
import { convertRemoveProcessorToOtel } from './processors/remove';
import { convertRenameProcessorToOtel } from './processors/rename';
import { convertReplaceProcessorToOtel } from './processors/replace';
import { convertSetProcessorToOtel } from './processors/set';
import { convertSplitProcessorToOtel } from './processors/split';
import { convertTrimProcessorToOtel } from './processors/trim';
import { convertUppercaseProcessorToOtel } from './processors/uppercase';
import type { OtelCollectorTranspilationResult, OtelProcessorConfig } from './types';

export interface DispatchResult {
  emissions: Emission[];
  warnings: string[];
}

const UNSUPPORTED_REASONS: Partial<Record<string, string>> = {
  enrich: 'requires an external lookup policy; no OTTL equivalent exists',
  math: 'requires a full expression evaluator; OTTL supports only basic arithmetic',
  network_direction: 'requires IP network range tables; no OTTL equivalent exists',
  sort: 'OTTL has no array-sort function',
  remove_by_prefix: 'OTTL does not support iterating over attribute keys by prefix',
  manual_ingest_pipeline: 'this processor is specific to the Elasticsearch ingest pipeline',
  dissect: 'ExtractDissectPatterns is not available in the OTTL log context',
};

/**
 * Warn when a processor explicitly sets `ignore_missing: false`. OTTL has no
 * "error on nil" primitive — the `field != nil` guard silently no-ops instead.
 */
const ignoreMissingWarning = (action: string, field: string): string =>
  `${action} on field "${field}" has ignore_missing: false, but OTTL silently skips missing ` +
  `fields rather than raising. Pipelines relying on this as a validation gate will not ` +
  `behave the same as ingest pipeline or ES|QL.`;

/**
 * Dispatch one flattened Streamlang processor to its OTel emission. Actions
 * with no OTTL equivalent throw — the transpiler does not produce a partial
 * config that silently drops processors from the pipeline.
 */
export const convertProcessorToOtel = (
  processor: StreamlangProcessorDefinition
): { emission: Emission; warnings: string[] } => {
  switch (processor.action) {
    case 'set':
      return { emission: convertSetProcessorToOtel(processor as SetProcessor), warnings: [] };
    case 'rename': {
      const p = processor as RenameProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('rename', p.from)] : [];
      return { emission: convertRenameProcessorToOtel(p), warnings };
    }
    case 'remove': {
      const p = processor as RemoveProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('remove', p.from)] : [];
      return { emission: convertRemoveProcessorToOtel(p), warnings };
    }
    case 'uppercase': {
      const p = processor as UppercaseProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('uppercase', p.from)] : [];
      return { emission: convertUppercaseProcessorToOtel(p), warnings };
    }
    case 'lowercase': {
      const p = processor as LowercaseProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('lowercase', p.from)] : [];
      return { emission: convertLowercaseProcessorToOtel(p), warnings };
    }
    case 'trim': {
      const p = processor as TrimProcessor;
      const warnings = p.ignore_missing === false ? [ignoreMissingWarning('trim', p.from)] : [];
      return { emission: convertTrimProcessorToOtel(p), warnings };
    }
    case 'replace': {
      const p = processor as ReplaceProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('replace', p.from)] : [];
      return { emission: convertReplaceProcessorToOtel(p), warnings };
    }
    case 'split': {
      const p = processor as SplitProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('split', p.from)] : [];
      return { emission: convertSplitProcessorToOtel(p), warnings };
    }
    case 'convert': {
      const p = processor as ConvertProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('convert', p.from)] : [];
      return { emission: convertConvertProcessorToOtel(p), warnings };
    }
    case 'redact': {
      const p = processor as RedactProcessor;
      const { emission, warnings: patternWarnings } = convertRedactProcessorToOtel(p);
      const ignoreMissingWarnings =
        p.ignore_missing === false ? [ignoreMissingWarning('redact', p.from)] : [];
      return { emission, warnings: [...patternWarnings, ...ignoreMissingWarnings] };
    }
    case 'concat': {
      const p = processor as ConcatProcessor;
      return convertConcatProcessorToOtel(p);
    }
    case 'join': {
      const p = processor as JoinProcessor;
      const warnings =
        p.ignore_missing === false ? [ignoreMissingWarning('join', p.from.join(', '))] : [];
      return { emission: convertJoinProcessorToOtel(p), warnings };
    }
    case 'append': {
      const p = processor as AppendProcessor;
      return convertAppendProcessorToOtel(p);
    }
    case 'date': {
      const p = processor as DateProcessor;
      return convertDateProcessorToOtel(p);
    }
    case 'json_extract': {
      const p = processor as JsonExtractProcessor;
      const { emission, warnings: procWarnings } = convertJsonExtractProcessorToOtel(p);
      const ignoreMissingWarnings =
        p.ignore_missing === false ? [ignoreMissingWarning('json_extract', p.field)] : [];
      return { emission, warnings: [...procWarnings, ...ignoreMissingWarnings] };
    }
    case 'grok':
      return convertGrokProcessorToOtel(processor as GrokProcessor);
    case 'drop_document':
      return {
        emission: convertDropDocumentProcessorToOtel(processor as DropDocumentProcessor),
        warnings: [],
      };
    default: {
      const reason =
        UNSUPPORTED_REASONS[processor.action] ??
        `no OTTL equivalent is known for this action`;
      throw new Error(
        `OTel Collector transpiler: action "${processor.action}" cannot be transpiled — ${reason}.`
      );
    }
  }
};

export type OtelErrorMode = 'ignore' | 'silent' | 'propagate';

/**
 * Walk the flattened processors, collect emissions, and group contiguous
 * emissions of the same kind into a single OTel processor instance. Ordering
 * is preserved: a `transform → filter → transform` sequence emits three
 * processor instances in that order.
 */
export const assembleOtelConfig = (
  processors: StreamlangProcessorDefinition[],
  errorMode: OtelErrorMode = 'ignore'
): OtelCollectorTranspilationResult & { emissions: Emission[] } => {
  const emissions: Emission[] = [];
  const warnings: string[] = [];

  for (const processor of processors) {
    const { emission, warnings: processorWarnings } = convertProcessorToOtel(processor);
    emissions.push(emission);
    warnings.push(...processorWarnings);
  }

  const out: Record<string, OtelProcessorConfig> = {};
  const pipelineProcessors: string[] = [];

  const transformCounter = { n: 0 };
  const filterCounter = { n: 0 };
  const unsupportedCounter = { n: 0 };

  // Group contiguous same-kind emissions together.
  let current: { kind: Emission['kind']; items: Emission[] } | null = null;
  const flushCurrent = () => {
    if (!current) return;
    const name = assignName(current.kind, {
      transform: transformCounter,
      filter: filterCounter,
      unsupported: unsupportedCounter,
    });
    out[name] = buildProcessorConfig(current.kind, current.items, errorMode);
    pipelineProcessors.push(name);
    current = null;
  };

  for (const emission of emissions) {
    if (current && current.kind === emission.kind) {
      current.items.push(emission);
    } else {
      flushCurrent();
      current = { kind: emission.kind, items: [emission] };
    }
  }
  flushCurrent();

  return {
    processors: out,
    pipelineProcessors,
    yaml: '', // populated by the caller
    warnings,
    emissions,
  };
};

const assignName = (
  kind: Emission['kind'],
  counters: {
    transform: { n: number };
    filter: { n: number };
    unsupported: { n: number };
  }
): string => {
  if (kind === 'transform') {
    counters.transform.n += 1;
    return counters.transform.n === 1
      ? 'transform/streamlang'
      : `transform/streamlang_${counters.transform.n}`;
  }
  if (kind === 'filter') {
    counters.filter.n += 1;
    return counters.filter.n === 1 ? 'filter/streamlang' : `filter/streamlang_${counters.filter.n}`;
  }
  counters.unsupported.n += 1;
  return `__streamlang_unsupported_${counters.unsupported.n}`;
};

const buildProcessorConfig = (
  kind: Emission['kind'],
  items: Emission[],
  errorMode: OtelErrorMode
): OtelProcessorConfig => {
  if (kind === 'transform') {
    const statements = items.flatMap((e) => (e.kind === 'transform' ? e.statements : []));
    return { error_mode: errorMode, log_statements: statements };
  }
  if (kind === 'filter') {
    const conditions = items.flatMap((e) => (e.kind === 'filter' ? e.conditions : []));
    return { error_mode: errorMode, log_conditions: conditions };
  }
  // unsupported — we flatten into a single placeholder with the combined message.
  const first = items.find(
    (e): e is Extract<Emission, { kind: 'unsupported' }> => e.kind === 'unsupported'
  );
  return {
    __streamlang_unsupported: true,
    action: first?.action ?? 'unknown',
    reason: items
      .filter((e): e is Extract<Emission, { kind: 'unsupported' }> => e.kind === 'unsupported')
      .map((e) => `${e.action}: ${e.reason}`)
      .join('; '),
  };
};
