/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { Render } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  column: string;
  compact: boolean;
  filterGroup: string;
}
export function timefilterControl(): ExpressionFunctionDefinition<
  'timefilterControl',
  null,
  Arguments,
  Render<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().timefilterControl;

  return {
    name: 'timefilterControl',
    aliases: [],
    type: 'render',
    inputTypes: ['null'],
    help,
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        help: argHelp.column,
        default: '@timestamp',
      },
      compact: {
        types: ['boolean'],
        help: argHelp.compact,
        default: true,
        options: [true, false],
      },
      filterGroup: {
        types: ['string'],
        help: argHelp.filterGroup,
      },
    },
    fn: (input, args) => {
      return {
        type: 'render',
        as: 'time_filter',
        value: args,
      };
    },
  };
}
