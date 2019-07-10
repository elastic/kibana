/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { image, ImageMode } from '../../functions/common/image';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof image>> = {
  help: i18n.translate('xpack.canvas.functions.imageHelpText', {
    defaultMessage:
      'Displays an image. Provide an image asset as a `{base64}` data {url}, or pass in a sub-expression.',
    values: {
      base64: 'base64',
      url: 'URL',
    },
  }),
  args: {
    dataurl: i18n.translate('xpack.canvas.functions.image.args.dataurlHelpText', {
      defaultMessage: 'The {https} {url} or `{base64}` data {url} of an image.',
      values: {
        base64: 'base64',
        https: 'HTTP(S)',
        url: 'URL',
      },
    }),
    mode: i18n.translate('xpack.canvas.functions.image.args.modeHelpText', {
      defaultMessage:
        '`{contain}` shows the entire image, scaled to fit. ' +
        '`{cover}` fills the container with the image, cropping from the sides or ' +
        'bottom as needed. ' +
        '`{stretch}` resizes the height and width of the image to 100% of the container.',
      values: {
        contain: ImageMode.CONTAIN,
        cover: ImageMode.COVER,
        stretch: ImageMode.STRETCH,
      },
    }),
  },
};

export const errors = {
  invalidImageMode: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.image.invalidImageModeErrorMessage', {
        defaultMessage: '"mode" must be "{contain}", "{cover}", or "{stretch}"',
        values: {
          contain: ImageMode.CONTAIN,
          cover: ImageMode.COVER,
          stretch: ImageMode.STRETCH,
        },
      })
    ),
};
