/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no @typed def; Elastic library
import { evaluate } from 'tinymath';
// @ts-ignore untyped local
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';
import { Datatable, isDatatable, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  expression: string;
}

type Input = number | Datatable;

export function math(): ExpressionFunctionDefinition<'math', Input, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().math;
  const errors = getFunctionErrors().math;

  return {
    name: 'math',
    type: 'number',
    inputTypes: ['number', 'datatable'],
    help,
    args: {
      expression: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.expression,
      },
    },
    fn: (input, args) => {
      const { expression } = args;

      if (!expression || expression.trim() === '') {
        throw errors.emptyExpression();
      }

      const mathContext = isDatatable(input)
        ? pivotObjectArray(
            input.rows,
            input.columns.map(col => col.name)
          )
        : { value: input };

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
        if (isDatatable(input) && input.rows.length === 0) {
          throw errors.emptyDatatable();
        } else {
          throw e;
        }
      }
    },
  };
}
