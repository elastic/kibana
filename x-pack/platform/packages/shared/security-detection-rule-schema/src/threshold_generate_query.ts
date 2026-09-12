/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLSingleAstItem } from '@elastic/esql/types';
import type { GeneratedQuery, QueryGenerationInput } from '@kbn/alerting-v2-rule-builders';
import type { ThresholdBuilderFields } from './threshold_builder_fields';

// ---------------------------------------------------------------------------
// Helper: column from a dotted field name
//
// Passing the dotted name as a single string (not split) causes the printer to
// emit it as a backtick-quoted identifier (e.g. `user.name`).  That matches
// the design's example output and is the correct ES|QL syntax for dotted field
// names that would otherwise be ambiguous.
//
// Ref: rule-execution-logic.md "security.detection.threshold"
// ---------------------------------------------------------------------------
const column = (field: string) => Builder.expression.column(field);

// ---------------------------------------------------------------------------
// Helper: AND two or more predicates into one expression
// ---------------------------------------------------------------------------
const andAll = (predicates: ESQLSingleAstItem[]): ESQLSingleAstItem => {
  if (predicates.length === 1) {
    return predicates[0];
  }
  return predicates.reduce((left, right) =>
    Builder.expression.func.binary('and', [left, right])
  );
};

// ---------------------------------------------------------------------------
// generateThresholdQuery
//
// Compiles a security.detection.threshold rule's builder fields into a
// standalone breach query.  Follows the design stage by stage:
//
//   1. FROM the index sources.
//   2. Optional WHERE KQL() / WHERE QSTR(allow_wildcard: true) — only when
//      `query` is non-empty.
//   3. One IS NOT NULL guard per grouping field, ANDed — only when
//      `threshold.field` is non-empty.
//   4. STATS threshold_count = COUNT(*) [, cardinality_count = COUNT_DISTINCT]
//      BY the grouping fields (BY omitted when field array is empty).
//   5. Post-aggregation WHERE threshold_count >= value
//      [AND cardinality_count >= value].
//   6. LIMIT max_signals — only when max_signals is present.
//
// Design deliberately omits MIN/MAX bucket timestamps that v1's translation
// also emits.  Do not add them.
//
// The function returns the standalone query shape:
//   { format: 'standalone', breach: { query: '<full ES|QL text>' } }
// with no grouping or time_field overrides — those are execution-time compile
// results' constraint.  grouping is set by deriveRuleFields at write time.
//
// Ref: rule-execution-logic.md "security.detection.threshold"
//      rule-execution-logic.md "AST composition is the required pattern"
// ---------------------------------------------------------------------------
export const generateThresholdQuery = ({
  fields,
}: QueryGenerationInput<ThresholdBuilderFields>): GeneratedQuery => {
  const { index, query, language, threshold, max_signals: maxSignals } = fields;
  const { field: groupingFields, value: thresholdValue, cardinality } = threshold;

  const commands: ESQLAstCommand[] = [];

  // 1. FROM
  commands.push(
    Builder.command({
      name: 'from',
      args: index.map((idx) => Builder.expression.source.index(idx)),
    })
  );

  // 2. WHERE KQL() / QSTR() — only when query is non-empty
  if (query.length > 0) {
    const queryLiteral = Builder.expression.literal.string(query);
    const filterFn =
      language === 'kuery'
        ? Builder.expression.func.call('KQL', [queryLiteral])
        : Builder.expression.func.call('QSTR', [
            queryLiteral,
            Builder.expression.func.binary(':', [
              Builder.expression.column('allow_wildcard'),
              Builder.expression.literal.boolean(true),
            ]),
          ]);
    commands.push(
      Builder.command({
        name: 'where',
        args: [filterFn],
      })
    );
  }

  // 3. IS NOT NULL guards — only when there are grouping fields
  if (groupingFields.length > 0) {
    const guards = groupingFields.map((field) =>
      Builder.expression.func.postfix('is not null', column(field))
    );
    commands.push(
      Builder.command({
        name: 'where',
        args: [andAll(guards)],
      })
    );
  }

  // 4. STATS
  const statsArgs: ESQLSingleAstItem[] = [];

  // threshold_count = COUNT(*)
  statsArgs.push(
    Builder.expression.func.binary('=', [
      column('threshold_count'),
      Builder.expression.func.call('COUNT', [Builder.expression.column('*')]),
    ])
  );

  // Optional: cardinality_count = COUNT_DISTINCT(field)
  const cardinalityEntry = cardinality?.[0];
  if (cardinalityEntry !== undefined) {
    statsArgs.push(
      Builder.expression.func.binary('=', [
        column('cardinality_count'),
        Builder.expression.func.call('COUNT_DISTINCT', [column(cardinalityEntry.field)]),
      ])
    );
  }

  // BY grouping fields — only when there are grouping fields
  const statsCommand: ESQLAstCommand = Builder.command({
    name: 'stats',
    args:
      groupingFields.length > 0
        ? [
            ...statsArgs,
            Builder.option({
              name: 'by',
              args: groupingFields.map(column),
            }),
          ]
        : statsArgs,
  });
  commands.push(statsCommand);

  // 5. Post-aggregation WHERE
  const postFilters: ESQLSingleAstItem[] = [
    Builder.expression.func.binary('>=', [
      column('threshold_count'),
      Builder.expression.literal.integer(thresholdValue),
    ]),
  ];
  if (cardinalityEntry !== undefined) {
    postFilters.push(
      Builder.expression.func.binary('>=', [
        column('cardinality_count'),
        Builder.expression.literal.integer(cardinalityEntry.value),
      ])
    );
  }
  commands.push(
    Builder.command({
      name: 'where',
      args: [andAll(postFilters)],
    })
  );

  // 6. LIMIT — only when max_signals is present
  if (maxSignals !== undefined) {
    commands.push(
      Builder.command({
        name: 'limit',
        args: [Builder.expression.literal.integer(maxSignals)],
      })
    );
  }

  const queryText = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
    pipeTab: '',
  });

  return {
    query: {
      format: 'standalone' as const,
      breach: { query: queryText },
    },
    // No grouping or time_field overrides: execution-time compile results must
    // not carry them.  grouping.fields is derived from threshold.field at write
    // time by deriveRuleFields.
  };
};
