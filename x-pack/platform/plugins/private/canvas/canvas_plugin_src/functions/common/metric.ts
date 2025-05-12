/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openSans } from '@kbn/expressions-plugin/common/fonts';
import {
  ExpressionFunctionDefinition,
  ExpressionValueRender,
  Style,
} from '@kbn/expressions-plugin/common';
import { help as strings } from '../../../i18n/functions/dict/metric';

export type Input = number | string | null;

export interface Arguments {
  label: string;
  metricFont: Style;
  metricFormat: string;
  labelFont: Style;
}

export type ExpressionMetricFunction = () => ExpressionFunctionDefinition<
  'metric',
  Input,
  Arguments,
  ExpressionValueRender<Arguments>
>;

export const metric: ExpressionMetricFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'metric',
    aliases: [],
    type: 'render',
    inputTypes: ['number', 'string', 'null'],
    help,
    args: {
      label: {
        types: ['string'],
        aliases: ['_', 'text', 'description'],
        help: argHelp.label,
        default: '""',
      },
      labelFont: {
        types: ['style'],
        help: argHelp.labelFont,
        default: `{font size=14 family="${openSans.value}" color="#000000" align=center}`,
      },
      metricFont: {
        types: ['style'],
        help: argHelp.metricFont,
        default: `{font size=48 family="${openSans.value}" color="#000000" align=center lHeight=48}`,
      },
      metricFormat: {
        types: ['string'],
        aliases: ['format'],
        help: argHelp.metricFormat,
      },
    },
    fn: (input, { label, labelFont, metricFont, metricFormat }) => {
      return {
        type: 'render',
        as: 'metric',
        value: {
          metric: input === null ? '?' : input,
          label,
          labelFont,
          metricFont,
          metricFormat,
        },
      };
    },
  };
};
