/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeRight } from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  count: number;
}

export function tail(): ExpressionFunction<'tail', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().tail;

  return {
    name: 'tail',
    aliases: [],
    type: 'datatable',
    help,
    context: {
      types: ['datatable'],
    },
    args: {
      count: {
        aliases: ['_'],
        types: ['number'],
        help: argHelp.count,
      },
    },
    fn: (context, args) => ({
      ...context,
      rows: takeRight(context.rows, args.count),
    }),
  };
}
