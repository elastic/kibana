/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { math } from '../../../canvas_plugin_src/functions/common/math';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { DATATABLE, CONTEXT, TINYMATH, TINYMATH_URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof math>> = {
  help: i18n.translate('xpack.canvas.functions.mathHelpText', {
    defaultMessage:
      'Interprets a {TINYMATH} math expression using a number or {DATATABLE} as {CONTEXT}. ' +
      'The {DATATABLE} columns are available by their column name. ' +
      'If the {CONTEXT} is a number it is available as {value}.',
    values: {
      TINYMATH,
      CONTEXT,
      DATATABLE,
      value: '`value`',
    },
  }),
  args: {
    expression: i18n.translate('xpack.canvas.functions.math.args.expressionHelpText', {
      defaultMessage: 'An evaluated {TINYMATH} expression. See {TINYMATH_URL}.',
      values: {
        TINYMATH,
        TINYMATH_URL,
      },
    }),
  },
};

export const errors = {
  emptyExpression: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.math.emptyExpressionErrorMessage', {
        defaultMessage: 'Empty expression',
      })
    ),
  tooManyResults: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.math.tooManyResultsErrorMessage', {
        defaultMessage:
          'Expressions must return a single number. Try wrapping your expression in {mean} or {sum}',
        values: {
          mean: 'mean()',
          sum: 'sum()',
        },
      })
    ),
  executionFailed: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.math.executionFailedErrorMessage', {
        defaultMessage: 'Failed to execute math expression. Check your column names',
      })
    ),
  emptyDatatable: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.math.emptyDatatableErrorMessage', {
        defaultMessage: 'Empty datatable',
      })
    ),
};
