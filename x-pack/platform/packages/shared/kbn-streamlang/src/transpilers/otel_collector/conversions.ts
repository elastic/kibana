/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DropDocumentProcessor,
  GrokProcessor,
  RemoveProcessor,
  RenameProcessor,
  SetProcessor,
  StreamlangProcessorDefinition,
  UppercaseProcessor,
} from '../../../types/processors';
import type { Emission } from './emission';
import { convertDropDocumentProcessorToOtel } from './processors/drop_document';
import { convertGrokProcessorToOtel } from './processors/grok';
import { convertRemoveProcessorToOtel } from './processors/remove';
import { convertRenameProcessorToOtel } from './processors/rename';
import { convertSetProcessorToOtel } from './processors/set';
import { convertUppercaseProcessorToOtel } from './processors/uppercase';
import type { OtelCollectorTranspilationResult, OtelProcessorConfig } from './types';

export interface DispatchResult {
  emissions: Emission[];
  warnings: string[];
}

/**
 * Dispatch one flattened Streamlang processor to its OTel emission. Actions
 * outside the Phase 1 surface return an `unsupported` emission so the caller
 * can thread a warning through — the pipeline stays valid, just with a comment
 * marking the gap.
 */
export const convertProcessorToOtel = (
  processor: StreamlangProcessorDefinition
): { emission: Emission; warnings: string[] } => {
  switch (processor.action) {
    case 'set':
      return { emission: convertSetProcessorToOtel(processor as SetProcessor), warnings: [] };
    case 'rename':
      return {
        emission: convertRenameProcessorToOtel(processor as RenameProcessor),
        warnings: [],
      };
    case 'remove':
      return {
        emission: convertRemoveProcessorToOtel(processor as RemoveProcessor),
        warnings: [],
      };
    case 'uppercase':
      return {
        emission: convertUppercaseProcessorToOtel(processor as UppercaseProcessor),
        warnings: [],
      };
    case 'grok':
      return convertGrokProcessorToOtel(processor as GrokProcessor);
    case 'drop_document':
      return {
        emission: convertDropDocumentProcessorToOtel(processor as DropDocumentProcessor),
        warnings: [],
      };
    default:
      return {
        emission: {
          kind: 'unsupported',
          action: processor.action,
          reason: `Action "${processor.action}" is not yet supported by the OTel collector transpiler (Phase 1 scope).`,
        },
        warnings: [
          `Action "${processor.action}" was skipped — not yet supported by the OTel collector transpiler.`,
        ],
      };
  }
};

/**
 * Walk the flattened processors, collect emissions, and group contiguous
 * emissions of the same kind into a single OTel processor instance. Ordering
 * is preserved: a `transform → filter → transform` sequence emits three
 * processor instances in that order.
 */
export const assembleOtelConfig = (
  processors: StreamlangProcessorDefinition[]
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
    out[name] = buildProcessorConfig(current.kind, current.items);
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

const buildProcessorConfig = (kind: Emission['kind'], items: Emission[]): OtelProcessorConfig => {
  if (kind === 'transform') {
    const statements = items.flatMap((e) => (e.kind === 'transform' ? e.statements : []));
    return { error_mode: 'ignore', log_statements: statements };
  }
  if (kind === 'filter') {
    const conditions = items.flatMap((e) => (e.kind === 'filter' ? e.conditions : []));
    return { error_mode: 'ignore', log_conditions: conditions };
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
