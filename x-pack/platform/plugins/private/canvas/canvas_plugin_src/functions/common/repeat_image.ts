/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionValueRender, ExpressionFunctionDefinition } from '../../types';

const BASE64 = '`base64`';
const URL = 'URL';

interface Arguments {
  image: string | null;
  size: number;
  max: number | null;
  emptyImage: string | null;
}

interface Return {
  count: number;
  image: string;
  size: number;
  max: number;
  emptyImage: string | null;
}

type ExpressionRepeatImageFunction = () => ExpressionFunctionDefinition<
  'repeatImage',
  number,
  Arguments,
  Promise<ExpressionValueRender<Arguments>>
>;

export const strings = {
  help: i18n.translate('expressionRepeatImage.functions.repeatImageHelpText', {
    defaultMessage: 'Configures a repeating image element.',
  }),
  args: {
    emptyImage: i18n.translate(
      'expressionRepeatImage.functions.repeatImage.args.emptyImageHelpText',
      {
        defaultMessage:
          'Fills the difference between the {CONTEXT} and {maxArg} parameter for the element with this image. ' +
          'Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
        values: {
          BASE64,
          CONTEXT: '_context_',
          maxArg: '`max`',
          URL,
        },
      }
    ),
    image: i18n.translate('expressionRepeatImage.functions.repeatImage.args.imageHelpText', {
      defaultMessage:
        'The image to repeat. Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
      values: {
        BASE64,
        URL,
      },
    }),
    max: i18n.translate('expressionRepeatImage.functions.repeatImage.args.maxHelpText', {
      defaultMessage: 'The maximum number of times the image can repeat.',
    }),
    size: i18n.translate('expressionRepeatImage.functions.repeatImage.args.sizeHelpText', {
      defaultMessage:
        'The maximum height or width of the image, in pixels. ' +
        'When the image is taller than it is wide, this function limits the height.',
    }),
  },
};

const errors = {
  getMissingMaxArgumentErrorMessage: () =>
    i18n.translate('expressionRepeatImage.error.repeatImage.missingMaxArgument', {
      defaultMessage: '{maxArgument} must be set if providing an {emptyImageArgument}',
      values: {
        maxArgument: '`max`',
        emptyImageArgument: '`emptyImage`',
      },
    }),
};

export const repeatImage: ExpressionRepeatImageFunction = () => {
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
        '@kbn/expression-utils'
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
};
