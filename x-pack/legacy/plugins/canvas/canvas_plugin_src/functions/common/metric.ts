/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { openSans } from '../../../common/lib/fonts';
import { Render, Style } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

type Context = number | string | null;

interface Arguments {
  label: string;
  metricFont: Style;
  metricFormat: string;
  labelFont: Style;
}

export function metric(): ExpressionFunction<'metric', Context, Arguments, Render<Arguments>> {
  const { help, args: argHelp } = getFunctionHelp().metric;

  return {
    name: 'metric',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['number', 'string', 'null'],
    },
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
    fn: (context, { label, labelFont, metricFont, metricFormat }) => {
      return {
        type: 'render',
        as: 'metric',
        value: {
          metric: context === null ? '?' : context,
          label,
          labelFont,
          metricFont,
          metricFormat,
        },
      };
    },
  };
}
