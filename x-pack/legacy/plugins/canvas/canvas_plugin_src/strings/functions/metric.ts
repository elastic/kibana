/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metric } from '../../functions/common/metric';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { FONT_FAMILY, FONT_WEIGHT, CSS } from '../constants';

export const help: FunctionHelp<FunctionFactory<typeof metric>> = {
  help: i18n.translate('xpack.canvas.functions.metricHelpText', {
    defaultMessage: 'Displays a number over a label.',
  }),
  args: {
    label: i18n.translate('xpack.canvas.functions.metric.args.labelHelpText', {
      defaultMessage: 'The text describing the metric.',
    }),
    metricFont: i18n.translate('xpack.canvas.functions.metric.args.metricFontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the metric. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS,
        FONT_FAMILY,
        FONT_WEIGHT,
      },
    }),
    labelFont: i18n.translate('xpack.canvas.functions.metric.args.labelFontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the label. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS,
        FONT_FAMILY,
        FONT_WEIGHT,
      },
    }),
  },
};
