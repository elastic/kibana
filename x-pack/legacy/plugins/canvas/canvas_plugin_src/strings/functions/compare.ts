/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { compare, Operation } from '../../functions/common/compare';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof compare>> = {
  help: i18n.translate('xpack.canvas.functions.compareHelpText', {
    defaultMessage:
      'Compares the {context} to specified value to determine `true` or `false`. Usually used in combination with `{ifFn}` or `{caseFn}`. ' +
      'This only works with primitive types, such as {examples}. See also `{eqFn}`, `{gtFn}`, `{gteFn}`, `{ltFn}`, `{lteFn}`, `{neqFn}`',
    values: {
      context: '_context_',
      ifFn: 'if',
      caseFn: 'case',
      examples: ['number', 'string', 'boolean'].map(type => `\`${type}\``).join(', '),
      eqFn: 'eq',
      gtFn: 'gt',
      gteFn: 'gte',
      ltFn: 'lt',
      lteFn: 'lte',
      neqFn: 'neq',
    },
  }),
  args: {
    op: i18n.translate('xpack.canvas.functions.compare.args.opHelpText', {
      defaultMessage:
        'The operator to use in the comparison: {eq} (equal to), {gt} (greater than), {gte} (greater than or equal to)' +
        ', {lt} (less than), {lte} (less than or equal to), {ne} or {neq} (not equal to).',
      values: {
        eq: Operation.EQ,
        gt: Operation.GT,
        gte: Operation.GTE,
        lt: Operation.LT,
        lte: Operation.LTE,
        ne: Operation.NE,
        neq: Operation.NEQ,
      },
    }),
    to: i18n.translate('xpack.canvas.functions.compare.args.toHelpText', {
      defaultMessage: 'The value compared to the {context}.',
      values: {
        context: '_context_',
      },
    }),
  },
};

export const errors = {
  invalidCompareOperator: (op: string, ops: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.compare.invalidCompareOperatorErrorMessage', {
        defaultMessage: "Invalid compare operator: '{op}'. Use {ops}",
        values: {
          op,
          ops,
        },
      })
    ),
};
