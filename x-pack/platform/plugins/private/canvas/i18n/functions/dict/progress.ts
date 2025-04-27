/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { progress } from '../../../canvas_plugin_src/functions/common/progress';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

enum Progress {
  GAUGE = 'gauge',
  HORIZONTAL_BAR = 'horizontalBar',
  HORIZONTAL_PILL = 'horizontalPill',
  SEMICIRCLE = 'semicircle',
  UNICORN = 'unicorn',
  VERTICAL_BAR = 'verticalBar',
  VERTICAL_PILL = 'verticalPill',
  WHEEL = 'wheel',
}

export const help: FunctionHelp<FunctionFactory<typeof progress>> = {
  help: i18n.translate('xpack.canvas.functions.progressHelpText', {
    defaultMessage: 'Configures a progress element.',
  }),
  args: {
    barColor: i18n.translate('xpack.canvas.functions.progress.args.barColorHelpText', {
      defaultMessage: 'The color of the background bar.',
    }),
    barWeight: i18n.translate('xpack.canvas.functions.progress.args.barWeightHelpText', {
      defaultMessage: 'The thickness of the background bar.',
    }),
    font: i18n.translate('xpack.canvas.functions.progress.args.fontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the label. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS: 'CSS',
        FONT_FAMILY: '`font-family`',
        FONT_WEIGHT: '`font-weight`',
      },
    }),
    label: i18n.translate('xpack.canvas.functions.progress.args.labelHelpText', {
      defaultMessage:
        'To show or hide the label, use {BOOLEAN_TRUE} or {BOOLEAN_FALSE}. Alternatively, provide a string to display as a label.',
      values: {
        BOOLEAN_TRUE: '`true`',
        BOOLEAN_FALSE: '`false`',
      },
    }),
    max: i18n.translate('xpack.canvas.functions.progress.args.maxHelpText', {
      defaultMessage: 'The maximum value of the progress element.',
    }),
    shape: i18n.translate('xpack.canvas.functions.progress.args.shapeHelpText', {
      defaultMessage: `Select {list}, or {end}.`,
      values: {
        list: Object.values(Progress)
          .slice(0, -1)
          .map((shape) => `\`"${shape}"\``)
          .join(', '),
        end: `\`"${Object.values(Progress).slice(-1)[0]}"\``,
      },
    }),
    valueColor: i18n.translate('xpack.canvas.functions.progress.args.valueColorHelpText', {
      defaultMessage: 'The color of the progress bar.',
    }),
    valueWeight: i18n.translate('xpack.canvas.functions.progress.args.valueWeightHelpText', {
      defaultMessage: 'The thickness of the progress bar.',
    }),
  },
};

export const errors = {
  invalidMaxValue: (max: number) =>
    new Error(
      i18n.translate('xpack.canvas.functions.progress.invalidMaxValueErrorMessage', {
        defaultMessage: "Invalid {arg} value: ''{max, number}''. ''{arg}'' must be greater than 0",
        values: {
          arg: 'max',
          max,
        },
      })
    ),
  invalidValue: (value: number, max: number = 1) =>
    new Error(
      i18n.translate('xpack.canvas.functions.progress.invalidValueErrorMessage', {
        defaultMessage:
          "Invalid value: ''{value, number}''. Value must be between 0 and {max, number}",
        values: {
          value,
          max,
        },
      })
    ),
};
