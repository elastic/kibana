/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type {
  RenameProcessor,
  SetProcessor,
  GrokProcessor,
  DateProcessor,
  DissectProcessor,
  AppendProcessor,
} from '../../../types/processors';

import type { Condition } from '../../../types/conditions';
import {
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
} from '../../../types/conditions';

import type { ESQLTranspilationOptions } from '.';
function literalFromAny(value: any): ESQLAstItem {
  if (typeof value === 'string') {
    return Builder.expression.literal.string(value);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? Builder.expression.literal.integer(value)
      : Builder.expression.literal.decimal(value);
  }
  if (typeof value === 'boolean') {
    return Builder.expression.literal.boolean(value);
  }
  if (value === null || value === undefined) {
    return Builder.expression.literal.nil();
  }
  // Fallback to string representation for complex objects
  return Builder.expression.literal.string(JSON.stringify(value));
}

function conditionToESQL(condition: Condition, isNested = false): ESQLAstItem {
  if (isFilterCondition(condition)) {
    const field = Builder.expression.column(condition.field);

    if ('eq' in condition) {
      return Builder.expression.func.binary('==', [field, literalFromAny(condition.eq)]);
    }
    if ('neq' in condition) {
      return Builder.expression.func.binary('!=', [field, literalFromAny(condition.neq)]);
    }
    if ('gt' in condition) {
      return Builder.expression.func.binary('>', [field, literalFromAny(condition.gt)]);
    }
    if ('gte' in condition) {
      return Builder.expression.func.binary('>=', [field, literalFromAny(condition.gte)]);
    }
    if ('lt' in condition) {
      return Builder.expression.func.binary('<', [field, literalFromAny(condition.lt)]);
    }
    if ('lte' in condition) {
      return Builder.expression.func.binary('<=', [field, literalFromAny(condition.lte)]);
    }
    if ('exists' in condition) {
      if (condition.exists === true) {
        return Builder.expression.func.unary('IS NOT NULL', field);
      } else {
        return Builder.expression.func.unary('IS NULL', field);
      }
    }
    if ('range' in condition && condition.range) {
      const parts: ESQLAstItem[] = [];
      if (condition.range.gt !== undefined)
        parts.push(
          Builder.expression.func.binary('>', [field, literalFromAny(condition.range.gt)])
        );
      if (condition.range.gte !== undefined)
        parts.push(
          Builder.expression.func.binary('>=', [field, literalFromAny(condition.range.gte)])
        );
      if (condition.range.lt !== undefined)
        parts.push(
          Builder.expression.func.binary('<', [field, literalFromAny(condition.range.lt)])
        );
      if (condition.range.lte !== undefined)
        parts.push(
          Builder.expression.func.binary('<=', [field, literalFromAny(condition.range.lte)])
        );

      if (parts.length === 1) return parts[0];
      return parts.reduce((acc, part) => Builder.expression.func.binary('and', [acc, part]));
    }
    if ('contains' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`%${condition.contains}%`),
      ]);
    }
    if ('startsWith' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`${condition.startsWith}%`),
      ]);
    }
    if ('endsWith' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`%${condition.endsWith}`),
      ]);
    }
  } else if (isAndCondition(condition)) {
    const andConditions = condition.and.map((c) => conditionToESQL(c, true));
    return andConditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]));
  } else if (isOrCondition(condition)) {
    const orConditions = condition.or.map((c) => conditionToESQL(c, true));
    return orConditions.reduce((acc, cond) => Builder.expression.func.binary('or', [acc, cond]));
  } else if (isNotCondition(condition)) {
    const notCondition = conditionToESQL(condition.not, true);
    return Builder.expression.func.unary('NOT', notCondition);
  } else if (isAlwaysCondition(condition)) {
    return Builder.expression.literal.boolean(true);
  }

  return Builder.expression.literal.boolean(false);
}

function convertProcessorToESQL(processor: StreamlangProcessorDefinition): ESQLAstCommand | null {
  const whereExpression = processor.where ? conditionToESQL(processor.where) : null;

  switch (processor.action) {
    case 'rename':
      const renameProcessor = processor as RenameProcessor;
      return Builder.command({
        name: 'rename',
        args: [
          Builder.expression.func.binary('as', [
            Builder.expression.column(renameProcessor.from),
            Builder.expression.column(renameProcessor.to),
          ]),
        ],
      });

    case 'set':
      const setProcessor = processor as SetProcessor;
      const valueExpression = literalFromAny(setProcessor.value);
      const assignment = whereExpression
        ? Builder.expression.func.call('CASE', [whereExpression, valueExpression])
        : valueExpression;

      return Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(setProcessor.to),
            assignment,
          ]),
        ],
      });

    case 'grok':
      const grokProcessor = processor as GrokProcessor;
      return Builder.command({
        name: 'grok',
        args: [
          Builder.expression.column(grokProcessor.from),
          Builder.expression.literal.string(grokProcessor.patterns[0]),
        ],
      });

    case 'dissect':
      const dissectProcessor = processor as DissectProcessor;
      return Builder.command({
        name: 'dissect',
        args: [
          Builder.expression.column(dissectProcessor.from),
          Builder.expression.literal.string(dissectProcessor.pattern),
        ],
      });

    case 'date':
      const dateProcessor = processor as DateProcessor;
      const dateParseExpressions = dateProcessor.formats.map((f) =>
        Builder.expression.func.call('DATE_PARSE', [
          Builder.expression.literal.string(f),
          Builder.expression.column(dateProcessor.from),
        ])
      );
      const coalesceDateParse = Builder.expression.func.call('COALESCE', dateParseExpressions);
      const targetDateField = dateProcessor.to || dateProcessor.from;

      return Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(targetDateField),
            Builder.expression.func.call('DATE_FORMAT', [
              Builder.expression.literal.string(dateProcessor.output_format || 'yyyy-MM-dd'),
              coalesceDateParse,
            ]),
          ]),
        ],
      });

    case 'append':
      const appendProcessor = processor as AppendProcessor;
      return Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(appendProcessor.to),
            Builder.expression.func.call('MV_APPEND', [
              Builder.expression.column(appendProcessor.to),
              literalFromAny(appendProcessor.value),
            ]),
          ]),
        ],
      });

    case 'manual_ingest_pipeline':
      return Builder.command({
        name: 'eval',
        args: [Builder.expression.literal.string('__MANUAL_INGEST_PIPELINE_PLACEHOLDER__')],
      });

    default:
      return null;
  }
}

function replacePlaceholdersWithComments(esqlQuery: string): string {
  return esqlQuery.replace(
    /\|\s*EVAL\s+"__MANUAL_INGEST_PIPELINE_PLACEHOLDER__"/g,
    '| // Manual ingest pipeline processors not supported in ES|QL'
  );
}

export function convertStreamlangDSLToESQLCommands(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions?: ESQLTranspilationOptions
): string {
  const esqlAstCommands: ESQLAstCommand[] = [];

  actionSteps.forEach((actionStep) => {
    const processorCommand = convertProcessorToESQL(actionStep);
    if (processorCommand) {
      esqlAstCommands.push(processorCommand);
    }
  });

  const query = Builder.expression.query(esqlAstCommands);
  let baseEsql = BasicPrettyPrinter.multiline(query);

  // Replace placeholders with comments
  baseEsql = replacePlaceholdersWithComments(baseEsql);

  return baseEsql;
}
