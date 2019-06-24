/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def; Elastic library
import { evaluate } from 'tinymath';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';
import { Datatable, isDatatable } from '../types';
import { getFunctionHelp, getFunctionErrors } from '../../strings';

interface Arguments {
  expression: string;
}

type Context = number | Datatable;

export function math(): ExpressionFunction<'math', Context, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().math;
  const errors = getFunctionErrors().math;

  return {
    name: 'math',
    type: 'number',
    help,
    context: {
      types: ['number', 'datatable'],
    },
    args: {
      expression: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.expression,
      },
    },
    fn: (context, args) => {
      const { expression } = args;

      if (!expression || expression.trim() === '') {
        throw errors.emptyExpression();
      }

      const mathContext = isDatatable(context)
        ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
        : { value: context };

      try {
        const result = evaluate(expression, mathContext);
        if (Array.isArray(result)) {
          if (result.length === 1) {
            return result[0];
          }
          throw errors.tooManyResults();
        }
        if (isNaN(result)) {
          throw errors.executionFailed();
        }
        return result;
      } catch (e) {
        if (isDatatable(context) && context.rows.length === 0) {
          throw errors.emptyDatatable();
        } else {
          throw e;
        }
      }
    },
  };
}
