/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { containerStyle } from '../../functions/common/containerStyle';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof containerStyle>> = {
  help: i18n.translate('xpack.canvas.functions.containerStyleHelpText', {
    defaultMessage: `Creates an object used for styling an element's container, including background, border, and opacity.`,
  }),
  args: {
    backgroundColor: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundColorHelpText',
      {
        defaultMessage: 'A valid {css} background color.',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundImage: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundImageHelpText',
      {
        defaultMessage: 'A valid {css} background image.',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundRepeat: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundRepeatHelpText',
      {
        defaultMessage: 'A valid {css} background repeat.',
        values: {
          css: 'CSS',
        },
      }
    ),
    backgroundSize: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.backgroundSizeHelpText',
      {
        defaultMessage: 'A valid {css} background size.',
        values: {
          css: 'CSS',
        },
      }
    ),
    border: i18n.translate('xpack.canvas.functions.containerStyle.args.borderHelpText', {
      defaultMessage: 'A valid {css} border.',
      values: {
        css: 'CSS',
      },
    }),
    borderRadius: i18n.translate(
      'xpack.canvas.functions.containerStyle.args.borderRadiusHelpText',
      {
        defaultMessage: 'The number of pixels to use when rounding the corners.',
      }
    ),
    opacity: i18n.translate('xpack.canvas.functions.containerStyle.args.opacityHelpText', {
      defaultMessage:
        'A number between 0 and 1 that represents the degree of transparency of the element.',
    }),
    overflow: i18n.translate('xpack.canvas.functions.containerStyle.args.overflowHelpText', {
      defaultMessage: 'A valid CSS overflow.',
    }),
    padding: i18n.translate('xpack.canvas.functions.containerStyle.args.paddingHelpText', {
      defaultMessage: 'The distance of the content, in pixels, from border.',
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
