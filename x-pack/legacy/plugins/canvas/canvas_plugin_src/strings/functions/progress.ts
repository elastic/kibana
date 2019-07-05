/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { progress } from '../../functions/common/progress';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

import { Shape } from '../../functions/common/progress';

export const help: FunctionHelp<FunctionFactory<typeof progress>> = {
  help: i18n.translate('xpack.canvas.functions.progressHelpText', {
    defaultMessage: 'Configure a progress element.',
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
        'The {css} font properties for the label. For example, {fontFamily} or {fontWeight}.',
      values: {
        css: 'CSS',
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
      },
    }),
    label: i18n.translate('xpack.canvas.functions.progress.args.labelHelpText', {
      defaultMessage:
        'To show or hide labels, use `true` or `false`. Alternatively, provide a string to display as a label.',
      values: {
        true: 'true',
        false: 'false',
      },
    }),
    max: i18n.translate('xpack.canvas.functions.progress.args.maxHelpText', {
      defaultMessage: 'The maximum value of the progress element',
    }),
    shape: i18n.translate('xpack.canvas.functions.progress.args.shapeHelpText', {
      defaultMessage: `Select {list}, or {end}.`,
      values: {
        list: Object.values(Shape)
          .slice(0, -1)
          .map(shape => `\`"${shape}"\``)
          .join(', '),
        end: `\`"${Object.values(Shape).slice(-1)[0]}"\``,
      },
    }),
    valueColor: i18n.translate('xpack.canvas.functions.progress.args.valueColorHelpText', {
      defaultMessage: 'The color of the progress bar',
    }),
    valueWeight: i18n.translate('xpack.canvas.functions.progress.args.valueWeightHelpText', {
      defaultMessage: 'The thickness of the progress bar',
    }),
  },
};

export const errors = {
  invalidMaxValue: (max: number) =>
    new Error(
      i18n.translate('xpack.canvas.functions.progress.invalidMaxValueErrorMessage', {
        defaultMessage: "Invalid {arg} value: '{max, number}'. '{arg}' must be greater than 0",
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
          "Invalid value: '{value, number}'. Value must be between 0 and {max, number}",
        values: {
          value,
          max,
        },
      })
    ),
};
