/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { Datatable, ExpressionValueRender, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  filterColumn: string;
  labelColumn: string;
  valueColumn: string;
  filterGroup: string;
}

interface Return {
  column: string;
  choices: Array<[string, string]>;
}

export function dropdownControl(): ExpressionFunctionDefinition<
  'dropdownControl',
  Datatable,
  Arguments,
  ExpressionValueRender<Return>
> {
  const { help, args: argHelp } = getFunctionHelp().dropdownControl;

  return {
    name: 'dropdownControl',
    aliases: [],
    type: 'render',
    inputTypes: ['datatable'],
    help,
    args: {
      filterColumn: {
        types: ['string'],
        required: true,
        help: argHelp.filterColumn,
      },
      labelColumn: {
        types: ['string'],
        required: false,
        help: argHelp.labelColumn,
      },
      valueColumn: {
        types: ['string'],
        required: true,
        help: argHelp.valueColumn,
      },
      filterGroup: {
        types: ['string'],
        help: argHelp.filterGroup,
      },
    },
    fn: (input, { valueColumn, filterColumn, filterGroup, labelColumn }) => {
      let choices: Array<[string, string]> = [];
      const labelCol = labelColumn || valueColumn;

      const filteredRows = input.rows.filter(
        (row) => row[valueColumn] !== null && row[valueColumn] !== undefined
      );

      if (filteredRows.length > 0) {
        choices = filteredRows.map((row) => [row[valueColumn], row[labelCol]]);

        choices = uniqBy(choices, (choice) => choice[0]);
      }

      const column = filterColumn || valueColumn;

      return {
        type: 'render',
        as: 'dropdown_filter',
        value: {
          column,
          choices,
          filterGroup,
        },
      };
    },
  };
}
