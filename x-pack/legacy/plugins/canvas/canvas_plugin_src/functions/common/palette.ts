/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { palettes } from '../../../common/lib/palettes';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  color: string[];
  gradient: boolean;
  reverse: boolean;
}

interface Return {
  type: 'palette';
  colors: string[];
  gradient: boolean;
}

export function palette(): ExpressionFunction<'palette', null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().palette;

  return {
    name: 'palette',
    aliases: [],
    type: 'palette',
    help,
    context: {
      types: ['null'],
    },
    args: {
      color: {
        aliases: ['_'],
        multi: true,
        types: ['string'],
        help: argHelp.color,
      },
      gradient: {
        types: ['boolean'],
        default: false,
        help: argHelp.gradient,
        options: [true, false],
      },
      reverse: {
        types: ['boolean'],
        default: false,
        help: argHelp.reverse,
        options: [true, false],
      },
    },
    fn: (_context, args) => {
      const { color, reverse, gradient } = args;
      const colors = ([] as string[]).concat(color || palettes.paul_tor_14.colors);

      return {
        type: 'palette',
        colors: reverse ? colors.reverse() : colors,
        gradient,
      };
    },
  };
}
