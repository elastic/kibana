/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';
import { ResolvedColumns } from '../../../public/expression_types/arg';

const { PartitionLabels: strings } = ModelStrings;

export const partitionLabels = () => ({
  name: 'partitionLabels',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'show',
      displayName: strings.getShowDisplayName(),
      help: strings.getShowHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'position',
      displayName: strings.getPositionDisplayName(),
      help: strings.getPositionHelp(),
      argType: 'select',
      default: 'default',
      options: {
        choices: [
          { value: 'default', name: strings.getPositionDefaultOption() },
          { value: 'inside', name: strings.getPositionInsideOption() },
        ],
      },
    },
    {
      name: 'values',
      displayName: strings.getValuesDisplayName(),
      help: strings.getValuesHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'percentDecimals',
      displayName: strings.getPercentDecimalsDisplayName(),
      help: strings.getPercentDecimalsHelp(),
      argType: 'range',
      default: 2,
      options: {
        min: 0,
        max: 10,
      },
    },
    {
      name: 'valuesFormat',
      displayName: strings.getValuesFormatDisplayName(),
      help: strings.getValuesFormatHelp(),
      argType: 'select',
      default: 'percent',
      options: {
        choices: [
          { value: 'percent', name: strings.getValuesFormatPercentOption() },
          { value: 'value', name: strings.getValuesFormatValueOption() },
        ],
      },
    },
  ],
  resolve({ context }: any): ResolvedColumns {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
