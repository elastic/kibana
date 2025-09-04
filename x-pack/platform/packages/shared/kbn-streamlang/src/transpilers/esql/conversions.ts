/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import { type CommonDatePreset } from '../../../types/formats';
import {
  isProcessWithOverrideOption,
  type StreamlangProcessorDefinition,
} from '../../../types/processors';
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
  if (Array.isArray(value)) {
    // Let the Builder handle nested structures properly
    return Builder.expression.list.literal({
      values: value.map((item) => literalFromAny(item)) as any,
    });
  }

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
        return Builder.expression.func.call('NOT', [
          Builder.expression.func.postfix('IS NULL', field),
        ]);
      } else {
        return Builder.expression.func.postfix('IS NULL', field);
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
      const {
        from,
        patterns, // eslint-disable-next-line @typescript-eslint/naming-convention
        ignore_missing = false, // default same as Grok Ingest Processor
        where,
      } = processor as GrokProcessor;
      const fromColumn = Builder.expression.column(from);

      const conditions = [];
      if (where) {
        conditions.push(conditionToESQL(where));
      }
      if (ignore_missing) {
        conditions.push(conditionToESQL({ field: from, exists: true }));
      }

      const finalCondition =
        conditions.length > 1
          ? conditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]))
          : conditions.length === 1
          ? conditions[0]
          : null;

      const commands = [];

      // Handle ignore_missing: true workaround by converting nulls to empty strings
      // So that GROK does not fail
      if (ignore_missing) {
        commands.push(
          Builder.command({
            name: 'eval',
            args: [
              Builder.expression.func.binary('=', [
                fromColumn,
                Builder.expression.func.call('CASE', [
                  conditionToESQL({ field: from, exists: true }),
                  fromColumn,
                  Builder.expression.literal.string(''),
                ]),
              ]),
            ],
          })
        );
      }

      // The GROK command
      // We only support the first pattern, as ES|QL GROK does not support multiple patterns.
      const grokCommand = Builder.command({
        name: 'grok',
        args: [fromColumn, Builder.expression.literal.string(patterns[0])],
      });
      commands.push(grokCommand);

      // Cleanup any temporary fields (created for where or ignore_missing)
      if (finalCondition) {
        // -- NOT POSSIBLE -- Same as with dissect
      }

      return commands;
    }

    case 'dissect': {
      const {
        from,
        pattern, // eslint-disable-next-line @typescript-eslint/naming-convention
        append_separator, // eslint-disable-next-line @typescript-eslint/naming-convention
        ignore_missing = false, // default same as Dissect Ingest Processor
        where,
      } = processor as DissectProcessor;
      const fromColumn = Builder.expression.column(from);

      const conditions = [];
      if (where) {
        conditions.push(conditionToESQL(where));
      }
      if (ignore_missing) {
        conditions.push(conditionToESQL({ field: from, exists: true }));
      }

      const finalCondition =
        conditions.length > 1
          ? conditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]))
          : conditions.length === 1
          ? conditions[0]
          : null;

      // If there are any conditions, we need to wrap the DISSECT command in a way that it only executes when the condition is met.
      // Since we cannot do this directly, we will have to accept that the fields will be created with null values when the condition is false.
      // This is a known limitation.

      const commands = [];

      // Handle ignore_missing: true workaround by converting nulls to empty strings
      // So that DISSECT does not fail
      if (ignore_missing) {
        commands.push(
          Builder.command({
            name: 'eval',
            args: [
              Builder.expression.func.binary('=', [
                fromColumn,
                Builder.expression.func.call('CASE', [
                  conditionToESQL({ field: from, exists: true }),
                  fromColumn,
                  Builder.expression.literal.string(''),
                ]),
              ]),
            ],
          })
        );
      }

      // The DISSECT command
      const dissectArgs = [fromColumn, Builder.expression.literal.string(pattern)];
      const dissectCommand = Builder.command({
        name: 'dissect',
        args: dissectArgs,
      });

      if (append_separator) {
        const option = Builder.option({
          name: 'append_separator',
          args: [Builder.expression.literal.string(append_separator)],
        });
        dissectCommand.args.push(option);
      }

      commands.push(dissectCommand);

      // Drop temporary fields (created for where or ignore_missing)
      if (finalCondition) {
        // -- NOT POSSIBLE -- Due to ES|QL limitation that we can't safely check if a column exists
        // This is not a perfect simulation, but it is the best we can do with the current ES|QL capabilities.
        // We are essentially applying the dissect to all rows, and the ones that don't match the condition will have null values for the dissected fields.
        // This is different from the ingest processor, which would not create the fields at all.
      }

      return commands;
    }

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
