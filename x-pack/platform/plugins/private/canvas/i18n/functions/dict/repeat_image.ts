/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { repeatImage } from '../../../canvas_plugin_src/functions/common/repeat_image';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { BASE64, URL } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof repeatImage>> = {
  help: i18n.translate('xpack.canvas.functions.repeatImageHelpText', {
    defaultMessage: 'Configures a repeating image element.',
  }),
  args: {
    emptyImage: i18n.translate('xpack.canvas.functions.repeatImage.args.emptyImageHelpText', {
      defaultMessage:
        'Fills the difference between the {CONTEXT} and {maxArg} parameter for the element with this image. ' +
        'Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
      values: {
        BASE64,
        CONTEXT: '_context_',
        maxArg: '`max`',
        URL,
      },
    }),
    image: i18n.translate('xpack.canvas.functions.repeatImage.args.imageHelpText', {
      defaultMessage:
        'The image to repeat. Provide an image asset as a {BASE64} data {URL}, or pass in a sub-expression.',
      values: {
        BASE64,
        URL,
      },
    }),
    max: i18n.translate('xpack.canvas.functions.repeatImage.args.maxHelpText', {
      defaultMessage: 'The maximum number of times the image can repeat.',
    }),
    size: i18n.translate('xpack.canvas.functions.repeatImage.args.sizeHelpText', {
      defaultMessage:
        'The maximum height or width of the image, in pixels. ' +
        'When the image is taller than it is wide, this function limits the height.',
    }),
  },
};

export const errors = {
  getMissingMaxArgumentErrorMessage: () =>
    i18n.translate('xpack.canvas.error.repeatImage.missingMaxArgument', {
      defaultMessage: '{maxArgument} must be set if providing an {emptyImageArgument}',
      values: {
        maxArgument: '`max`',
        emptyImageArgument: '`emptyImage`',
      },
    }),
};
