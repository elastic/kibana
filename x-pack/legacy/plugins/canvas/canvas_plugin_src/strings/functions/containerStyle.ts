/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { containerStyle } from '../../functions/common/containerStyle';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof containerStyle>> = {
  help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. You would usually use this inside of a charting function',
  }),
  args: {
    border: i18n.translate('xpack.canvas.functions.containerStyle.args.borderHelpText', {
      defaultMessage: 'Valid {css} border string',
      values: {
        css: 'CSS',
      },
    }),
    borderRadius: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.borderRadiusHelpText',
      {
        defaultMessage: 'Number of pixels to use when rounding the border',
      }
    ),
    padding: i18n.translate('xpack.canvas.functions.containerStyle.args.paddingHelpText', {
      defaultMessage: 'Content distance in pixels from border',
    }),
    backgroundColor: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundColorHelpText',
      {
        defaultMessage: 'Valid {css} background color string',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundImage: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundImageHelpText',
      {
        defaultMessage: 'Valid {css} background image string',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundSize: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundSizeHelpText',
      {
        defaultMessage: 'Valid {css} background size string',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundRepeat: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundRepeatHelpText',
      {
        defaultMessage: 'Valid {css} background repeat string',
        values: {
          css: 'CSS',
        },
      }
    ),
    opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.opacityHelpText', {
      defaultMessage:
        'A number between 0 and 1 representing the degree of transparency of the element',
    }),
    overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.overflowHelpText', {
      defaultMessage: 'Sets overflow of the container',
    }),
  },
};

export const errors = {
  invalidBackgroundImage: () =>
    new Error(
      i18n.translate('xpack.canvas.functions.containerStyle.invalidBackgroundImageErrorMessage', {
        defaultMessage: 'Invalid backgroundImage. Please provide an asset or a URL.',
      })
    ),
};
