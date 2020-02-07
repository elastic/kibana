/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { getFunctionHelp } from '../../../i18n';

const name = 'seriesStyle';

interface Arguments {
  bars: number;
  color: string;
  fill: number | boolean;
  horizontalBars: boolean;
  label: string;
  lines: number;
  points: number;
  stack: number | null;
}

interface Return extends Arguments {
  type: 'seriesStyle';
}

export function seriesStyle(): ExpressionFunction<'seriesStyle', null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().seriesStyle;

  return {
    name,
    help,
    type: 'seriesStyle',
    context: {
      types: ['null'],
    },
    args: {
      bars: {
        types: ['number'],
        help: argHelp.bars,
      },
      color: {
        types: ['string'],
        help: argHelp.color,
      },
      fill: {
        types: ['number', 'boolean'],
        help: argHelp.fill,
        default: false,
        options: [true, false],
      },
      horizontalBars: {
        types: ['boolean'],
        help: argHelp.horizontalBars,
        options: [true, false],
      },
      label: {
        types: ['string'],
        help: argHelp.label,
      },
      lines: {
        types: ['number'],
        help: argHelp.lines,
      },
      points: {
        types: ['number'],
        help: argHelp.points,
      },
      stack: {
        types: ['number', 'null'],
        help: argHelp.stack,
      },
    },
    fn: (_context, args) => ({ type: name, ...args }),
  };
}
