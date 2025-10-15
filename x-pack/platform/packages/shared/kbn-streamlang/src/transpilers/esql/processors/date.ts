/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { CommonDatePreset } from '../../../../types/formats';
import type { DateProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

export function convertDateProcessorToESQL(processor: DateProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    formats, // eslint-disable-next-line @typescript-eslint/naming-convention
    output_format,
    where,
  } = processor;
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
    Builder.expression.func.call('DATE_PARSE', [Builder.expression.literal.string(f), fromAsString])
  );

  const coalesceDateParse = Builder.expression.func.call('COALESCE', dateParseExpressions);

  let dateProcessorAssignment = resolvedOutputFormat
    ? Builder.expression.func.call('DATE_FORMAT', [
        Builder.expression.literal.string(resolvedOutputFormat),
        coalesceDateParse,
      ])
    : coalesceDateParse;

  if (where) {
    const whereCondition = conditionToESQLAst(where);
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
