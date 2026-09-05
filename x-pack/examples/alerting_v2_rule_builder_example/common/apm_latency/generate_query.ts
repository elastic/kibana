/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLSingleAstItem } from '@elastic/esql/types';
import type { GeneratedQuery } from '@kbn/alerting-v2-rule-builders';
import {
  LATENCY_COLUMN,
  SERVICE_ENVIRONMENT_FIELD,
  SERVICE_NAME_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
  TRANSACTION_TYPE_FIELD,
} from './constants';
import type { ApmLatencyBuilderFields } from './types';

/** Microseconds per millisecond; APM stores transaction duration in microseconds. */
const US_PER_MS = 1000;

/**
 * Builds a column from its dotted parts. Passing the dotted name as one string
 * would print it backtick-quoted as a single identifier.
 */
const column = (field: string) => Builder.expression.column(field.split('.'));

const equals = (field: string, value: string): ESQLSingleAstItem =>
  Builder.expression.func.binary('==', [column(field), Builder.expression.literal.string(value)]);

const and = (predicates: ESQLSingleAstItem[]): ESQLSingleAstItem =>
  predicates.reduce((left, right) => Builder.expression.func.binary('and', [left, right]));

/** Fields the latency is aggregated by, which are also the rule's alert grouping. */
export const getGroupingFields = ({ groupByTransactionName }: ApmLatencyBuilderFields): string[] =>
  groupByTransactionName ? [SERVICE_NAME_FIELD, TRANSACTION_NAME_FIELD] : [SERVICE_NAME_FIELD];

const buildBaseCommands = (fields: ApmLatencyBuilderFields): ESQLAstCommand[] => {
  const { index, serviceName, environment, transactionType, percentile } = fields;

  const filters = [equals(SERVICE_NAME_FIELD, serviceName)];
  if (environment) {
    filters.push(equals(SERVICE_ENVIRONMENT_FIELD, environment));
  }
  if (transactionType) {
    filters.push(equals(TRANSACTION_TYPE_FIELD, transactionType));
  }

  const percentileCall = Builder.expression.func.call('PERCENTILE', [
    column(TRANSACTION_DURATION_FIELD),
    Builder.expression.literal.integer(percentile),
  ]);

  return [
    Builder.command({
      name: 'from',
      args: [Builder.expression.source.index(index)],
    }),
    Builder.command({ name: 'where', args: [and(filters)] }),
    Builder.command({
      name: 'stats',
      args: [
        Builder.expression.func.binary('=', [
          column(LATENCY_COLUMN),
          Builder.expression.func.binary('/', [
            percentileCall,
            Builder.expression.literal.integer(US_PER_MS),
          ]),
        ]),
        Builder.option({
          name: 'by',
          args: getGroupingFields(fields).map(column),
        }),
      ],
    }),
  ];
};

/**
 * Generates the composed rule query for the APM latency builder.
 *
 * Example output for p95 > 500ms on service `checkout`:
 *   base:   FROM traces-apm*
 *             | WHERE service.name == "checkout"
 *             | STATS latency_ms = PERCENTILE(transaction.duration.us, 95) / 1000 BY service.name
 *   breach: | WHERE latency_ms > 500
 */
export const generateApmLatencyQuery = (fields: ApmLatencyBuilderFields): GeneratedQuery => {
  const base = BasicPrettyPrinter.multiline(Builder.expression.query(buildBaseCommands(fields)), {
    pipeTab: '  ',
  });

  const breach = Builder.command({
    name: 'where',
    args: [
      Builder.expression.func.binary('>', [
        column(LATENCY_COLUMN),
        Builder.expression.literal.decimal(fields.thresholdMs),
      ]),
    ],
  });

  const recoveryThreshold = fields.recoveryThresholdMs ?? fields.thresholdMs;
  const recovery = Builder.command({
    name: 'where',
    args: [
      Builder.expression.func.binary('<=', [
        column(LATENCY_COLUMN),
        Builder.expression.literal.decimal(recoveryThreshold),
      ]),
    ],
  });

  return {
    query: {
      format: 'composed' as const,
      base,
      breach: { segment: `| ${BasicPrettyPrinter.command(breach)}` },
      recovery: { segment: `| ${BasicPrettyPrinter.command(recovery)}` },
    },
    time_field: fields.timeField,
    grouping: { fields: getGroupingFields(fields) },
  };
};
