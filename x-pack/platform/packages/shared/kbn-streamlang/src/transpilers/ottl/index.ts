/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import type { SchemaContext } from './field_path';
import type { OttlFilterProcessor, OttlTransformProcessor } from './conversions';
import { convertProcessors } from './conversions';

export type { SchemaContext } from './field_path';

export interface OttlTranspilationOptions {
  /** How StreamLang field paths map to OTTL accessors. Default: 'otel-native'. */
  schemaContext?: SchemaContext;
  /** OTel signal type for pipeline naming. Default: 'logs'. */
  signalType?: 'logs' | 'traces' | 'metrics';
}

export interface OttlTranspilationResult {
  /** Compiled OTel Collector YAML config string. */
  compiled: string;
  /** Warnings for unsupported processors etc. */
  warnings: string[];
}

function isFilterProcessor(p: any): p is OttlFilterProcessor {
  return 'condition' in p;
}

function isTransformProcessor(p: any): p is OttlTransformProcessor {
  return 'logStatements' in p;
}

/**
 * Transpile a StreamLang DSL to OTel Collector YAML (processors + service.pipelines).
 */
export const transpile = async (
  streamlang: StreamlangDSL,
  options?: OttlTranspilationOptions
): Promise<OttlTranspilationResult> => {
  const validatedStreamlang = streamlangDSLSchema.parse(streamlang);
  const schemaContext = options?.schemaContext ?? 'otel-native';
  const signalType = options?.signalType ?? 'logs';

  const steps = flattenSteps(validatedStreamlang.steps);
  const { processors, warnings } = convertProcessors(steps, schemaContext, signalType);

  if (processors.length === 0) {
    return {
      compiled: '',
      warnings: warnings.map((w) => w.message),
    };
  }

  // Build YAML output
  const yamlLines: string[] = ['processors:'];
  const processorNames: string[] = [];

  for (const proc of processors) {
    processorNames.push(proc.name);

    if (isFilterProcessor(proc)) {
      yamlLines.push(`  ${proc.name}:`);
      yamlLines.push(`    error_mode: ${proc.errorMode}`);
      yamlLines.push(`    ${signalType}:`);
      yamlLines.push(`      ${proc.signalType}:`);
      yamlLines.push(`        - '${proc.condition}'`);
    } else if (isTransformProcessor(proc)) {
      yamlLines.push(`  ${proc.name}:`);
      const statementsKey = signalType === 'traces' ? 'trace_statements' : signalType === 'metrics' ? 'metric_statements' : 'log_statements';
      const contextName = signalType === 'traces' ? 'span' : signalType === 'metrics' ? 'metric' : 'log';
      yamlLines.push(`    ${statementsKey}:`);
      yamlLines.push(`      - context: ${contextName}`);
      yamlLines.push(`        statements:`);
      for (const stmt of proc.logStatements) {
        yamlLines.push(`          - ${quoteYamlStatement(stmt.statement)}`);
      }
    }
  }

  yamlLines.push('service:');
  yamlLines.push('  pipelines:');
  yamlLines.push(`    ${signalType}:`);
  yamlLines.push(`      processors: [${processorNames.join(', ')}]`);

  return {
    compiled: yamlLines.join('\n'),
    warnings: warnings.map((w) => w.message),
  };
};

function quoteYamlStatement(stmt: string): string {
  // If the statement contains special YAML chars, quote it
  if (stmt.includes(':') || stmt.includes('#') || stmt.includes('{') || stmt.includes('}')) {
    return `'${stmt.replace(/'/g, "''")}'`;
  }
  return stmt;
}
