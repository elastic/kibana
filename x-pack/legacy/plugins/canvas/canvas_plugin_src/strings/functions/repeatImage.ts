/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { repeatImage } from '../../functions/common/repeatImage';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof repeatImage>> = {
  help: i18n.translate('xpack.canvas.functions.repeatImageHelpText', {
    defaultMessage: 'Configure a repeating image element',
  }),
  args: {
    image: i18n.translate('xpack.canvas.functions.repeatImage.args.imageHelpText', {
      defaultMessage:
        'The image to repeat. Provide an image asset as a `{base64}` data {url}, or pass in a sub-expression.',
      values: {
        base64: 'base46',
        url: 'URL',
      },
    }),
    size: i18n.translate('xpack.canvas.functions.repeatImage.args.sizeHelpText', {
      defaultMessage:
        'The maximum height or width of the image, in pixels. ' +
        'When the image is taller than it is wide, this function limits the height.',
    }),
    max: i18n.translate('xpack.canvas.functions.repeatImage.args.maxHelpText', {
      defaultMessage: 'The maximum number of times the image can repeat',
    }),
    emptyImage: i18n.translate('xpack.canvas.functions.repeatImage.args.emptyImageHelpText', {
      defaultMessage:
        'Fill the difference between the _context_ and the `{max}` parameter with this image.' +
        'Provide an image asset as a `{base64}` data {url}, or pass in a sub-expression.',
      values: {
        base64: 'base64',
        max: 'max',
        url: 'URL',
      },
    }),
  },
};
