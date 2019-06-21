/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { font } from '../../functions/common/font';
import { FunctionHelp } from '.';
import { FunctionFactory, FontWeight } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof font>> = {
  help: i18n.translate('xpack.canvas.functions.fontHelpText', {
    defaultMessage: 'Create a font style',
  }),
  args: {
    align: i18n.translate('xpack.canvas.functions.font.args.alignHelpText', {
      defaultMessage: 'Horizontal text alignment',
    }),
    color: i18n.translate('xpack.canvas.functions.font.args.colorHelpText', {
      defaultMessage: 'Text color',
    }),
    family: i18n.translate('xpack.canvas.functions.font.args.familyHelpText', {
      defaultMessage: 'An acceptable {css} web font string',
      values: {
        css: 'CSS',
      },
    }),
    italic: i18n.translate('xpack.canvas.functions.font.args.italicHelpText', {
      defaultMessage: 'Italicize, true or false',
    }),
    lHeight: i18n.translate('xpack.canvas.functions.font.args.lHeightHelpText', {
      defaultMessage: 'Line height ({px})',
      values: {
        px: 'px',
      },
    }),
    size: i18n.translate('xpack.canvas.functions.font.args.sizeHelpText', {
      defaultMessage: 'Font size ({px})',
      values: {
        px: 'px',
      },
    }),
    underline: i18n.translate('xpack.canvas.functions.font.args.underlineHelpText', {
      defaultMessage: 'Underline the text, true or false',
    }),
    weight: i18n.translate('xpack.canvas.functions.font.args.weightHelpText', {
      defaultMessage: 'Set the font weight, e.g. {examples}',
      values: {
        examples: Object.values(FontWeight).join(', '),
      },
    }),
  },
};

export const errors = {
  invalidFontWeight: (weight: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.font.invalidFontWeightErrorMessage', {
        defaultMessage: "Invalid font weight: '{weight}'",
        values: {
          weight,
        },
      })
    ),
  invalidTextAlignment: (align: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.font.invalidTextAlignmentErrorMessage', {
        defaultMessage: "Invalid text alignment: '{align}'",
        values: {
          align,
        },
      })
    ),
};
