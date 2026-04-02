/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import { conditionToESQLAst } from './condition_to_esql';

import type { ESQLTranspilationOptions } from '.';
import type {
  AppendProcessor,
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  DropDocumentProcessor,
  GrokProcessor,
  MathProcessor,
  RedactProcessor,
  RemoveByPrefixProcessor,
  RemoveProcessor,
  RenameProcessor,
  ReplaceProcessor,
  SetProcessor,
  UppercaseProcessor,
  LowercaseProcessor,
  TrimProcessor,
  JoinProcessor,
  SplitProcessor,
  SortProcessor,
  ConcatProcessor,
  NetworkDirectionProcessor,
  JsonExtractProcessor,
  EnrichProcessor,
} from '../../../types/processors';
import { type StreamlangProcessorDefinition } from '../../../types/processors';
import {
  getStreamlangResolverForProcessor,
  type StreamlangResolver,
  type StreamlangResolverOptions,
} from '../../../types/resolvers';
import { convertAppendProcessorToESQL } from './processors/append';
import { convertConvertProcessorToESQL } from './processors/convert';
import { convertDateProcessorToESQL } from './processors/date';
import { convertDissectProcessorToESQL } from './processors/dissect';
import { convertDropDocumentProcessorToESQL } from './processors/drop_document';
import { convertGrokProcessorToESQL } from './processors/grok';
import { convertJoinProcessorToESQL } from './processors/join';
import { convertMathProcessorToESQL } from './processors/math';
import { convertRedactProcessorToESQL } from './processors/redact';
import { convertRemoveProcessorToESQL } from './processors/remove';
import { convertRemoveByPrefixProcessorToESQL } from './processors/remove_by_prefix';
import { convertRenameProcessorToESQL } from './processors/rename';
import { convertReplaceProcessorToESQL } from './processors/replace';
import { convertSetProcessorToESQL } from './processors/set';
import { convertSortProcessorToESQL } from './processors/sort';
import { convertSplitProcessorToESQL } from './processors/split';
import { createTransformStringESQL } from './transform_string';
import { convertConcatProcessorToESQL } from './processors/concat';
import { convertNetworkDirectionProcessorToESQL } from './processors/network_direction';
import { convertJsonExtractProcessorToESQL } from './processors/json_extract';
import { convertEnrichProcessorToESQL } from './processors/enrich';

async function convertProcessorToESQL(
  processor: StreamlangProcessorDefinition,
  resolver?: StreamlangResolver
): Promise<ESQLAstCommand[] | null> {
  switch (processor.action) {
    case 'rename':
      return convertRenameProcessorToESQL(processor as RenameProcessor);

    case 'set':
      return convertSetProcessorToESQL(processor as SetProcessor);

    case 'append':
      return convertAppendProcessorToESQL(processor as AppendProcessor);

    case 'convert':
      return convertConvertProcessorToESQL(processor as ConvertProcessor);

    case 'date':
      return convertDateProcessorToESQL(processor as DateProcessor);

    case 'dissect':
      return convertDissectProcessorToESQL(processor as DissectProcessor);

    case 'grok':
      return convertGrokProcessorToESQL(processor as GrokProcessor);

    case 'math':
      return convertMathProcessorToESQL(processor as MathProcessor);

    case 'remove_by_prefix':
      return convertRemoveByPrefixProcessorToESQL(processor as RemoveByPrefixProcessor);

    case 'remove':
      return convertRemoveProcessorToESQL(processor as RemoveProcessor);

    case 'drop_document':
      return convertDropDocumentProcessorToESQL(processor as DropDocumentProcessor);

    case 'replace':
      return convertReplaceProcessorToESQL(processor as ReplaceProcessor);

    case 'redact':
      return convertRedactProcessorToESQL(processor as RedactProcessor);

    case 'uppercase':
      const convertUppercaseProcessorToESQL = createTransformStringESQL('TO_UPPER');
      return convertUppercaseProcessorToESQL(processor as UppercaseProcessor);

    case 'lowercase':
      const convertLowercaseProcessorToESQL = createTransformStringESQL('TO_LOWER');
      return convertLowercaseProcessorToESQL(processor as LowercaseProcessor);

    case 'trim':
      const convertTrimProcessorToESQL = createTransformStringESQL('TRIM');
      return convertTrimProcessorToESQL(processor as TrimProcessor);

    case 'join':
      return convertJoinProcessorToESQL(processor as JoinProcessor);

    case 'split':
      return convertSplitProcessorToESQL(processor as SplitProcessor);

    case 'sort':
      return convertSortProcessorToESQL(processor as SortProcessor);

    case 'concat':
      return convertConcatProcessorToESQL(processor as ConcatProcessor);

    case 'network_direction':
      return convertNetworkDirectionProcessorToESQL(processor as NetworkDirectionProcessor);

    case 'json_extract':
      return convertJsonExtractProcessorToESQL(processor as JsonExtractProcessor);

    case 'enrich':
      if (!resolver) {
        throw new Error('Enrich policy resolver is required for enrich processor.');
      }
      return await convertEnrichProcessorToESQL(processor as EnrichProcessor, resolver);

    case 'manual_ingest_pipeline':
      return [
        Builder.command({
          name: 'eval',
          args: [
            Builder.expression.literal.string(
              'WARNING: Manual ingest pipeline not supported in ES|QL'
            ),
          ],
        }),
      ];

    default:
      return null;
  }
}

export async function convertStreamlangDSLToESQLCommands(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions: ESQLTranspilationOptions,
  resolverOptions?: StreamlangResolverOptions
): Promise<string> {
  const resolvedEsqlAstCommands = await Promise.all(
    actionSteps.map((processor) =>
      convertProcessorToESQL(
        processor,
        getStreamlangResolverForProcessor(processor, resolverOptions)
      )
    )
  );

  const esqlAstCommands = resolvedEsqlAstCommands
    .filter((cmds): cmds is ESQLAstCommand[] => cmds !== null)
    .flat();

  const query = Builder.expression.query(esqlAstCommands);

  return BasicPrettyPrinter.multiline(query, { pipeTab: transpilationOptions.pipeTab });
}

/**
 * Converts a condition to ES|QL string format using the existing AST approach
 * @example: { field: "age", range: { gte: 18, lt: 65 } } -> "age >= 18 AND age < 65"
 */
export function convertConditionToESQL(
  condition: Parameters<typeof conditionToESQLAst>[0]
): string {
  const ast = conditionToESQLAst(condition);
  return BasicPrettyPrinter.print(ast);
}
