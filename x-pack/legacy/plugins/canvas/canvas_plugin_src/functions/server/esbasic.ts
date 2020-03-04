/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common';
import { Filter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  index: string;
  fields: string;
}

export function esbasic(): ExpressionFunction<'esbasic', Filter, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().esbasic;

  return {
    name: 'esbasic',
    type: 'datatable',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      fields: {
        help: argHelp.fields,
        types: ['string'],
      },
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
    },
  };
}
