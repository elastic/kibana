/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { openSans } from '../../../common/lib/fonts';
import { Render, Style, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

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

export function progress(): ExpressionFunctionDefinition<
  'progress',
  number,
  Arguments,
  Render<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().progress;
  const errors = getFunctionErrors().progress;

  return {
    name: 'progress',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      shape: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.shape,
        options: Object.values(Shape),
        default: 'gauge',
      },
      barColor: {
        types: ['string'],
        help: argHelp.barColor,
        default: `#f0f0f0`,
      },
      barWeight: {
        types: ['number'],
        help: argHelp.barWeight,
        default: 20,
      },
      font: {
        types: ['style'],
        help: argHelp.font,
        default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
      },
      label: {
        types: ['boolean', 'string'],
        help: argHelp.label,
        default: true,
      },
      max: {
        types: ['number'],
        help: argHelp.max,
        default: 1,
      },
      valueColor: {
        types: ['string'],
        help: argHelp.valueColor,
        default: `#1785b0`,
      },
      valueWeight: {
        types: ['number'],
        help: argHelp.valueWeight,
        default: 20,
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
