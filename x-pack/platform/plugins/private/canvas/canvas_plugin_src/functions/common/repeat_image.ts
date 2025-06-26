/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionValueRender, ExpressionFunctionDefinition } from '../../../types';
import { help as strings, errors } from '../../../i18n/functions/dict/repeat_image';

interface Arguments {
  image: string | null;
  size: number;
  max: number | null;
  emptyImage: string | null;
}

export function repeatImage(): ExpressionFunctionDefinition<
  'repeatImage',
  number,
  Arguments,
  Promise<ExpressionValueRender<Arguments>>
> {
  const { help, args: argHelp } = strings;

  return {
    name: 'repeatImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: null,
      },
      max: {
        types: ['number', 'null'],
        help: argHelp.max,
        default: 1000,
      },
      size: {
        types: ['number'],
        default: 100,
        help: argHelp.size,
      },
    },
    fn: async (count, args) => {
      const { elasticOutline, isValidUrl, resolveWithMissingImage } = await import(
        '../../../public/lib'
      );
      if (args.emptyImage !== null && isValidUrl(args.emptyImage) && args.max === null) {
        throw new Error(errors.getMissingMaxArgumentErrorMessage());
      }
      return {
        type: 'render',
        as: 'repeatImage',
        value: {
          count: Math.floor(count),
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline),
          emptyImage: resolveWithMissingImage(args.emptyImage),
        },
      };
    },
  };
}
