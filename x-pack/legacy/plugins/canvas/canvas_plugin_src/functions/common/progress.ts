/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { openSans } from '../../../common/lib/fonts';
import { Render, Style } from '../types';
import { getFunctionHelp, getFunctionErrors } from '../../strings';

export enum Shape {
  GAUGE = 'gauge',
  HORIZONTAL_BAR = 'horizontalBar',
  HORIZONTAL_PILL = 'horizontalPill',
  SEMICIRCLE = 'semicircle',
  UNICORN = 'unicorn',
  VERTICAL_BAR = 'verticalBar',
  VERTICAL_PILL = 'verticalPill',
  WHEEL = 'wheel',
}

interface Arguments {
  barColor: string;
  barWeight: number;
  font: Style;
  label: boolean | string;
  max: number;
  shape: Shape;
  valueColor: string;
  valueWeight: number;
}

export function progress(): ExpressionFunction<'progress', number, Arguments, Render<Arguments>> {
  const { help, args: argHelp } = getFunctionHelp().progress;
  const errors = getFunctionErrors().progress;

  return {
    name: 'progress',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['number'],
    },
    args: {
      barColor: {
        default: `#f0f0f0`,
        help: argHelp.barColor,
        types: ['string'],
      },
      barWeight: {
        default: 20,
        help: argHelp.barWeight,
        types: ['number'],
      },
      font: {
        default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
        help: argHelp.font,
        types: ['style'],
      },
      label: {
        default: true,
        help: argHelp.label,
        types: ['boolean', 'string'],
      },
      max: {
        default: 1,
        help: argHelp.max,
        types: ['number'],
      },
      shape: {
        aliases: ['_'],
        default: 'gauge',
        help: argHelp.shape,
        options: Object.values(Shape),
        types: ['string'],
      },
      valueColor: {
        default: `#1785b0`,
        help: argHelp.valueColor,
        types: ['string'],
      },
      valueWeight: {
        default: 20,
        help: argHelp.valueWeight,
        types: ['number'],
      },
    },
    fn: (value, args) => {
      if (args.max <= 0) {
        throw errors.invalidMaxValue(args.max);
      }
      if (value > args.max || value < 0) {
        throw errors.invalidValue(value, args.max);
      }

      let label = '';
      if (args.label) {
        label = typeof args.label === 'string' ? args.label : `${value}`;
      }

      let font: Style = {} as Style;

      if (get(args, 'font.spec')) {
        font = { ...args.font };
        font.spec.fill = args.font.spec.color; // SVG <text> uses fill for font color
      }

      return {
        type: 'render',
        as: 'progress',
        value: {
          value,
          ...args,
          label,
          font,
        },
      };
    },
  };
}
