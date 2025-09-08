/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@kbn/esql-ast';
import { BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import { conditionToESQL, literalFromAny } from './condition_to_esql';

import type { ESQLTranspilationOptions } from '.';
import { type CommonDatePreset } from '../../../types/formats';
import type {
  AppendProcessor,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  RenameProcessor,
  SetProcessor,
} from '../../../types/processors';
import {
  isProcessWithOverrideOption,
  type StreamlangProcessorDefinition,
} from '../../../types/processors';
import { convertDissectProcessorToESQL } from './processors/dissect';
import { convertGrokProcessorToESQL } from './processors/grok';

function convertProcessorToESQL(processor: StreamlangProcessorDefinition): ESQLAstCommand[] | null {
  switch (processor.action) {
    case 'rename': {
      const {
        from,
        to, // eslint-disable-next-line @typescript-eslint/naming-convention
        ignore_missing = false, // default same as Rename Ingest Processor
        override = false, // default same as Rename Ingest Processor
        where,
      } = processor as RenameProcessor;
      const fromColumn = Builder.expression.column(from);
      const toColumn = Builder.expression.column(to);

      // Use the simple RENAME command only for the most basic case (no ignore_missing, no where, and override is true).
      if (!ignore_missing && override && !where) {
        return [
          Builder.command({
            name: 'rename',
            args: [Builder.expression.func.binary('as', [fromColumn, toColumn])],
          }),
        ];
      }

      const conditions = [];
      if (where) {
        conditions.push(conditionToESQL(where));
      }
      if (!override) {
        conditions.push(conditionToESQL({ field: to, exists: false }));
      }
      if (!ignore_missing) {
        conditions.push(conditionToESQL({ field: from, exists: true }));
      }

      const finalCondition =
        conditions.length > 1
          ? conditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]))
          : conditions[0];

      const assignment = finalCondition
        ? Builder.expression.func.call('CASE', [finalCondition, fromColumn, toColumn])
        : fromColumn;

      const evalCommand = Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [toColumn, assignment])],
      });

      const dropCommand = Builder.command({ name: 'drop', args: [fromColumn] });

      return [evalCommand, dropCommand];
    }

    case 'set':
      const setProcessor = processor as SetProcessor;

      // Param validation
      // Throw error if neither `value` nor `copy_from` is specified
      if (setProcessor.value === undefined && setProcessor.copy_from === undefined) {
        throw new Error(`Set processor requires either 'value' or 'copy_from' parameter.`);
      }

      // Throw error if both `value` and `copy_from` are specified
      if (setProcessor.value !== undefined && setProcessor.copy_from !== undefined) {
        throw new Error(`Set processor cannot have both 'value' and 'copy_from' parameters.`);
      }

      // Param handling
      // Handle `copy_from` if specified, otherwise use literal fron `value`
      let valueExpression = literalFromAny(setProcessor.value);
      if (setProcessor.copy_from) {
        valueExpression = Builder.expression.column(setProcessor.copy_from);
      }

      const whereExpression = processor.where ? conditionToESQL(processor.where) : null;
      const overrideExpression =
        isProcessWithOverrideOption(processor) && processor.override === false
          ? conditionToESQL({ field: processor.to, exists: false })
          : null;

      const mergedWhereExpression =
        whereExpression && overrideExpression
          ? Builder.expression.func.binary('and', [whereExpression, overrideExpression])
          : whereExpression || overrideExpression;

      // If there's a where condition or override is false, we need to use a CASE statement
      const assignment = mergedWhereExpression
        ? Builder.expression.func.call('CASE', [
            mergedWhereExpression,
            valueExpression,
            Builder.expression.column(setProcessor.to), // ELSE keep existing value
          ])
        : valueExpression;

      return [
        Builder.command({
          name: 'eval',
          args: [
            Builder.expression.func.binary('=', [
              Builder.expression.column(setProcessor.to),
              assignment,
            ]),
          ],
        }),
      ];

    case 'grok': {
      return convertGrokProcessorToESQL(processor as GrokProcessor, conditionToESQL);
    }

    case 'dissect':
      return convertDissectProcessorToESQL(processor as DissectProcessor, conditionToESQL);

    case 'date': {
      const {
        from,
        to,
        formats, // eslint-disable-next-line @typescript-eslint/naming-convention
        output_format,
        where,
      } = processor as DateProcessor;
      const fromColumn = Builder.expression.column(from);
      // In case ES has mapped fromColumn as datetime, we need to convert to string first for DATE_PARSE
      const fromAsString = Builder.expression.func.call('TO_STRING', [fromColumn]);
      const targetDateField = to ?? '@timestamp'; // As with Ingest Date Processor, default to @timestamp
      const toColumn = Builder.expression.column(targetDateField);

      const resolvedInputFormats = formats.map((f) =>
        resolveCommonDatePresetsForESQL(f as CommonDatePreset)
      );
      const resolvedOutputFormat = output_format
        ? resolveCommonDatePresetsForESQL(output_format as CommonDatePreset)
        : undefined;

      const dateParseExpressions = resolvedInputFormats.map((f) =>
        Builder.expression.func.call('DATE_PARSE', [
          Builder.expression.literal.string(f),
          fromAsString,
        ])
      );

      const coalesceDateParse = Builder.expression.func.call('COALESCE', dateParseExpressions);

      let dateProcessorAssignment = resolvedOutputFormat
        ? Builder.expression.func.call('DATE_FORMAT', [
            Builder.expression.literal.string(resolvedOutputFormat),
            coalesceDateParse,
          ])
        : coalesceDateParse;

      if (where) {
        const whereCondition = conditionToESQL(where);
        dateProcessorAssignment = Builder.expression.func.call('CASE', [
          whereCondition,
          dateProcessorAssignment,
          toColumn,
        ]);
      }

      return [
        Builder.command({
          name: 'eval',
          args: [Builder.expression.func.binary('=', [toColumn, dateProcessorAssignment])],
        }),
      ];
    }

    case 'append': {
      const {
        to,
        value, // eslint-disable-next-line @typescript-eslint/naming-convention
        allow_duplicates = true, // default to true to match Append Ingest Processor
        where,
      } = processor as AppendProcessor;
      const toColumn = Builder.expression.column(to);
      const appendValueExpression = literalFromAny(value);

      let appendExpression = Builder.expression.func.call('MV_APPEND', [
        toColumn,
        appendValueExpression,
      ]);

      if (!allow_duplicates) {
        appendExpression = Builder.expression.func.call('MV_DEDUPE', [appendExpression]);
      }

      // If the target field is null, set it to the new value. Otherwise, append.
      let appendAssignment = Builder.expression.func.call('CASE', [
        Builder.expression.func.postfix('IS NULL', toColumn),
        appendValueExpression,
        appendExpression,
      ]);

      if (where) {
        const whereCondition = conditionToESQL(where);
        appendAssignment = Builder.expression.func.call('CASE', [
          whereCondition,
          appendAssignment,
          toColumn,
        ]);
      }

      return [
        Builder.command({
          name: 'eval',
          args: [Builder.expression.func.binary('=', [toColumn, appendAssignment])],
        }),
      ];
    }

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

function resolveCommonDatePresetsForESQL(format: CommonDatePreset): string {
  switch (format) {
    case 'ISO8601':
      return "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
    case 'RFC1123':
      return 'EEE, dd MMM yyyy HH:mm:ss z';
    case 'YYYY-MM-DD':
      return 'yyyy-MM-dd';
    case 'COMMON_LOG':
      return 'dd/MMM/yyyy:HH:mm:ss Z';
    case 'UNIX':
      return 'epoch_second';
    case 'UNIX_MS':
      return 'epoch_millis';
    default:
      return format;
  }
}
