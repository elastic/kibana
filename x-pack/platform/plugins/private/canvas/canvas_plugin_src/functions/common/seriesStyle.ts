/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
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

interface Output extends Arguments {
  type: 'seriesStyle';
}

export function seriesStyle(): ExpressionFunctionDefinition<
  'seriesStyle',
  null,
  Arguments,
  Output
> {
  const { help, args: argHelp } = getFunctionHelp().seriesStyle;

  return {
    name,
    help,
    type: 'seriesStyle',
    inputTypes: ['null'],
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
    fn: (input, args) => ({ type: name, ...args }),
  };
}
