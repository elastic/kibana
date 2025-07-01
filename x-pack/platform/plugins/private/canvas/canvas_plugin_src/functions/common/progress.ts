/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { Style, openSans } from '@kbn/expressions-plugin/common';
import { Progress, ExpressionProgressFunction } from '../../renderers/progress/types';
import { help as strings, errors } from '../../../i18n/functions/dict/progress';

export const progress: ExpressionProgressFunction = () => {
  const { help, args: argHelp } = strings;

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
        options: Object.values(Progress),
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
};
