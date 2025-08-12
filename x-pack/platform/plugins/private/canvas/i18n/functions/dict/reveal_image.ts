/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { revealImage } from '../../../canvas_plugin_src/functions/common/reveal_image';
import { FunctionHelp } from '../function_help';
import { FunctionFactory, Position } from '../../../types';
import { BASE64, URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof revealImage>> = {
  help: i18n.translate('xpack.canvas.functions.revealImageHelpText', {
    defaultMessage: 'Configures an image reveal element.',
  }),
  args: {
    image: i18n.translate('xpack.canvas.functions.revealImage.args.imageHelpText', {
      defaultMessage:
        'The image to reveal. Provide an image asset as a {BASE64} data {URL}, ' +
        'or pass in a sub-expression.',
      values: {
        BASE64,
        URL,
      },
    }),
    emptyImage: i18n.translate('xpack.canvas.functions.revealImage.args.emptyImageHelpText', {
      defaultMessage:
        'An optional background image to reveal over. ' +
        'Provide an image asset as a `{BASE64}` data {URL}, or pass in a sub-expression.',
      values: {
        BASE64: '`base64`',
        URL,
      },
    }),
    origin: i18n.translate('xpack.canvas.functions.revealImage.args.originHelpText', {
      defaultMessage: 'The position to start the image fill. For example, {list}, or {end}.',
      values: {
        list: Object.values(Position)
          .slice(0, -1)
          .map((position) => `\`"${position}"\``)
          .join(', '),
        end: Object.values(Position).slice(-1)[0],
      },
    }),
  },
};

export const errors = {
  invalidPercent: (percent: number) =>
    new Error(
      i18n.translate('xpack.canvas.functions.revealImage.invalidPercentErrorMessage', {
        defaultMessage: "Invalid value: ''{percent}''. Percentage must be between 0 and 1",
        values: {
          percent,
        },
      })
    ),
  invalidImageUrl: (imageUrl: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.revealImage.invalidImageUrl', {
        defaultMessage: "Invalid image url: ''{imageUrl}''.",
        values: {
          imageUrl,
        },
      })
    ),
};
