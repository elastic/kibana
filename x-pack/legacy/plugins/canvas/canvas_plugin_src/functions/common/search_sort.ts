/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { SearchSort } from '../../../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  column: string;
  direction: 'asc' | 'desc';
}

export function searchSort(): ExpressionFunction<'searchSort', null, Arguments, SearchSort> {
  const { help, args: argHelp } = getFunctionHelp().searchSort;
  return {
    name: 'searchSort',
    help,
    args: {
      column: {
        types: ['string'],
        required: true,
        help: argHelp.column,
        aliases: ['_'],
      },
      direction: {
        types: ['string'],
        required: true,
        help: argHelp.direction,
        options: ['asc', 'desc'],
      },
    },
    fn: (_, args) => {
      return {
        type: 'searchSort',
        column: args.column,
        direction: args.direction,
      };
    },
  };
}
