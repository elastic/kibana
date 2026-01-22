/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@kbn/esql-language';
import { BasicPrettyPrinter, Builder } from '@kbn/esql-language';
import { conditionToESQLAst } from './condition_to_esql';

import type { ESQLTranspilationOptions } from '.';
import type {
  AppendProcessor,
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  MathProcessor,
  RenameProcessor,
  SetProcessor,
  RemoveByPrefixProcessor,
  RemoveProcessor,
  DropDocumentProcessor,
  ReplaceProcessor,
  UppercaseProcessor,
  LowercaseProcessor,
  TrimProcessor,
  JoinProcessor,
} from '../../../types/processors';
import { type StreamlangProcessorDefinition } from '../../../types/processors';
import { convertRenameProcessorToESQL } from './processors/rename';
import { convertSetProcessorToESQL } from './processors/set';
import { convertAppendProcessorToESQL } from './processors/append';
import { convertDateProcessorToESQL } from './processors/date';
import { convertDissectProcessorToESQL } from './processors/dissect';
import { convertGrokProcessorToESQL } from './processors/grok';
import { convertConvertProcessorToESQL } from './processors/convert';
import { convertRemoveByPrefixProcessorToESQL } from './processors/remove_by_prefix';
import { convertRemoveProcessorToESQL } from './processors/remove';
import { convertDropDocumentProcessorToESQL } from './processors/drop_document';
import { convertReplaceProcessorToESQL } from './processors/replace';
import { convertMathProcessorToESQL } from './processors/math';
import { createTransformStringESQL } from './transform_string';
import { convertJoinProcessorToESQL } from './processors/join';

function convertProcessorToESQL(processor: StreamlangProcessorDefinition): ESQLAstCommand[] | null {
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

export function convertStreamlangDSLToESQLCommands(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions: ESQLTranspilationOptions
): string {
  const esqlAstCommands = actionSteps
    .map((processor) => convertProcessorToESQL(processor))
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
