/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { Render, ContainerStyle } from '../../../types';
import { getFunctionHelp } from '../../../i18n';
// @ts-ignore unconverted local file
import { DEFAULT_ELEMENT_CSS } from '../../../common/lib/constants';

interface ContainerStyleArgument extends ContainerStyle {
  type: 'containerStyle';
}

interface Arguments {
  as: string;
  css: string;
  containerStyle: ContainerStyleArgument;
}
export function render(): ExpressionFunction<'render', Render<any>, Arguments, Render<Arguments>> {
  const { help, args: argHelp } = getFunctionHelp().render;

  return {
    name: 'render',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['render'],
    },
    args: {
      as: {
        types: ['string'],
        help: argHelp.as,
        options: [
          'advanced_filter',
          'debug',
          'dropdown_filter',
          'error',
          'image',
          'markdown',
          'metric',
          'pie',
          'plot',
          'progress',
          'repeatImage',
          'revealImage',
          'shape',
          'table',
          'time_filter',
          'text',
        ],
      },
      css: {
        types: ['string'],
        help: argHelp.css,
        default: `"${DEFAULT_ELEMENT_CSS}"`,
      },
      containerStyle: {
        types: ['containerStyle'],
        help: argHelp.containerStyle,
        default: '{containerStyle}',
      },
    },
    fn: (context, args) => {
      return {
        ...context,
        as: args.as || context.as,
        css: args.css || DEFAULT_ELEMENT_CSS,
        containerStyle: args.containerStyle,
      };
    },
  };
}
