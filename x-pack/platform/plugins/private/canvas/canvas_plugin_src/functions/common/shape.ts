/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '../../../types';
import { getAvailableShapes, Shape } from '../../renderers/shape';
import { help as strings, errors } from '../../../i18n/functions/dict/shape';

interface Arguments {
  border: string;
  borderWidth: number;
  shape: Shape;
  fill: string;
  maintainAspect: boolean;
}

export interface Output extends Arguments {
  type: 'shape';
}

export type ExpressionShapeFunction = () => ExpressionFunctionDefinition<
  'shape',
  number | null,
  Arguments,
  Output
>;

export const shape: ExpressionShapeFunction = () => {
  const { help, args: argHelp } = strings;

  return {
    name: 'shape',
    aliases: [],
    inputTypes: ['null'],
    help,
    args: {
      shape: {
        types: ['string'],
        help: argHelp.shape,
        aliases: ['_'],
        default: 'square',
        options: Object.values(Shape),
      },
      border: {
        types: ['string'],
        aliases: ['stroke'],
        help: argHelp.border,
      },
      borderWidth: {
        types: ['number'],
        aliases: ['strokeWidth'],
        help: argHelp.borderWidth,
        default: 0,
      },
      fill: {
        types: ['string'],
        help: argHelp.fill,
        default: 'black',
      },
      maintainAspect: {
        types: ['boolean'],
        help: argHelp.maintainAspect,
        default: false,
        options: [true, false],
      },
    },
    fn: (_, args) => {
      const avaliableShapes = getAvailableShapes();
      if (!avaliableShapes.includes(args.shape)) {
        throw errors.invalidShape(args.shape);
      }

      return {
        type: 'shape',
        ...args,
      };
    },
  };
};
