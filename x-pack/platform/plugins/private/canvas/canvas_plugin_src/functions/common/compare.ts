/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

export enum Operation {
  EQ = 'eq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  NE = 'ne',
  NEQ = 'neq',
}

interface Arguments {
  op: Operation;
  to: Context;
}

type Context = boolean | number | string | null;

export function compare(): ExpressionFunctionDefinition<'compare', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().compare;
  const errors = getFunctionErrors().compare;

  return {
    name: 'compare',
    help,
    aliases: ['condition'],
    type: 'boolean',
    inputTypes: ['string', 'number', 'boolean', 'null'],
    args: {
      op: {
        aliases: ['_'],
        types: ['string'],
        default: 'eq',
        help: argHelp.op,
        options: Object.values(Operation),
      },
      to: {
        aliases: ['this', 'b'],
        help: argHelp.to,
      },
    },
    fn: (input, args) => {
      const a = input;
      const { to: b, op } = args;
      const typesMatch = typeof a === typeof b;

      switch (op) {
        case Operation.EQ:
          return a === b;
        case Operation.NE:
        case Operation.NEQ:
          return a !== b;
        case Operation.LT:
          if (typesMatch) {
            // @ts-expect-error #35433 This is a wonky comparison for nulls
            return a < b;
          }
          return false;
        case Operation.LTE:
          if (typesMatch) {
            // @ts-expect-error #35433 This is a wonky comparison for nulls
            return a <= b;
          }
          return false;
        case Operation.GT:
          if (typesMatch) {
            // @ts-expect-error #35433 This is a wonky comparison for nulls
            return a > b;
          }
          return false;
        case Operation.GTE:
          if (typesMatch) {
            // @ts-expect-error #35433 This is a wonky comparison for nulls
            return a >= b;
          }
          return false;
        default:
          throw errors.invalidCompareOperator(op, Object.values(Operation).join(', '));
      }
    },
  };
}
