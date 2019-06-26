/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metric } from '../../functions/common/metric';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof metric>> = {
  help: i18n.translate('xpack.canvas.functions.metricHelpText', {
    defaultMessage: 'A number with a label',
  }),
  args: {
    label: i18n.translate('xpack.canvas.functions.metric.args.labelHelpText', {
      defaultMessage: 'Text describing the metric',
    }),
    metricFont: i18n.translate('xpack.canvas.functions.metric.args.metricFontHelpText', {
      defaultMessage:
        'Font settings for the metric. Technically you can stick other styles in here too!',
    }),
    labelFont: i18n.translate('xpack.canvas.functions.metric.args.labelFontHelpText', {
      defaultMessage:
        'Font settings for the label. Technically you can stick other styles in here too!',
    }),
  },
};
