/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { Handlebars } from '../../../common/lib/handlebars';
import { Datatable, Render, Style } from '../types';
import { getFunctionHelp } from '../../strings';

type Context = Datatable | null;

interface Arguments {
  content: string[];
  font: Style;
}

interface Return {
  content: string;
  font: Style;
}

export function markdown(): ExpressionFunction<'markdown', Context, Arguments, Render<Return>> {
  const { help, args: argHelp } = getFunctionHelp().markdown;

  return {
    name: 'markdown',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['datatable', 'null'],
    },
    args: {
      content: {
        aliases: ['_', 'expression'],
        types: ['string'],
        help: argHelp.content,
        default: '""',
        multi: true,
      },
      font: {
        types: ['style'],
        help: argHelp.font,
        default: '{font}',
      },
    },
    fn: (context, args) => {
      const compileFunctions = args.content.map(str =>
        Handlebars.compile(String(str), { knownHelpersOnly: true })
      );
      const ctx = {
        columns: [],
        rows: [],
        type: null,
        ...context,
      };

      return {
        type: 'render',
        as: 'markdown',
        value: {
          content: compileFunctions.map(fn => fn(ctx)).join(''),
          font: args.font,
        },
      };
    },
  };
}
