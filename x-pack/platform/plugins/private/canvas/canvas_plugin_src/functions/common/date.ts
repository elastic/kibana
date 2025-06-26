/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  value: string;
  format: string;
}

export function date(): ExpressionFunctionDefinition<'date', null, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().date;
  const errors = getFunctionErrors().date;

  return {
    name: 'date',
    type: 'number',
    help,
    inputTypes: ['null'],
    args: {
      value: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.value,
      },
      format: {
        types: ['string'],
        help: argHelp.format,
      },
    },
    fn: (input, args) => {
      const { value: argDate, format } = args;

      const outputDate =
        argDate && format
          ? moment.utc(argDate, format).toDate()
          : argDate
          ? new Date(argDate)
          : new Date();

      if (isNaN(outputDate.getTime())) {
        throw errors.invalidDateInput(argDate);
      }

      return outputDate.valueOf();
    },
  };
}
