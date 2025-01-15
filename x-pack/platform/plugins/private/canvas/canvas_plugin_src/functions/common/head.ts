/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import { Datatable, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  count: number;
}

export function head(): ExpressionFunctionDefinition<'head', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().head;

  return {
    name: 'head',
    aliases: [],
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      count: {
        aliases: ['_'],
        types: ['number'],
        help: argHelp.count,
        default: 1,
      },
    },
    fn: (input, args) => ({
      ...input,
      rows: take(input.rows, args.count),
    }),
  };
}
