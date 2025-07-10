/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition, ExpressionValueRender } from '../../../types';
import { help as strings, errors } from '../../../i18n/functions/dict/reveal_image';

export enum Origin {
  TOP = 'top',
  LEFT = 'left',
  BOTTOM = 'bottom',
  RIGHT = 'right',
}

interface Arguments {
  image: string | null;
  emptyImage: string | null;
  origin: Origin;
}

interface Output {
  image: string;
  emptyImage: string;
  origin: Origin;
  percent: number;
}

export function revealImage(): ExpressionFunctionDefinition<
  'revealImage',
  number,
  Arguments,
  Promise<ExpressionValueRender<Output>>
> {
  const { help, args: argHelp } = strings;

  return {
    name: 'revealImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: null,
      },
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      origin: {
        types: ['string'],
        help: argHelp.origin,
        default: 'bottom',
        options: Object.values(Origin),
      },
    },
    fn: async (percent, args) => {
      if (percent > 1 || percent < 0) {
        throw errors.invalidPercent(percent);
      }

      const { resolveWithMissingImage, elasticOutline, isValidUrl } = await import(
        '../../../public/lib'
      );

      if (args.image && !isValidUrl(args.image)) {
        throw errors.invalidImageUrl(args.image);
      }

      return {
        type: 'render',
        as: 'revealImage',
        value: {
          percent,
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline) as string,
          emptyImage: resolveWithMissingImage(args.emptyImage) as string,
        },
      };
    },
  };
}
