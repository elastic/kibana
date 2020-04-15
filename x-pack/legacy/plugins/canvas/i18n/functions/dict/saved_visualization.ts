/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { savedVisualization } from '../../../canvas_plugin_src/functions/common/saved_visualization';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof savedVisualization>> = {
  help: i18n.translate('xpack.canvas.functions.savedVisualizationHelpText', {
    defaultMessage: `Returns an embeddable for a saved visualization object`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.savedVisualization.args.idHelpText', {
      defaultMessage: `The ID of the Saved Visualization Object`,
    }),
    timerange: i18n.translate('xpack.canvas.functions.savedVisualization.args.timerangeHelpText', {
      defaultMessage: `The timerange of data that should be included`,
    }),
    colors: i18n.translate('xpack.canvas.functions.savedVisualization.args.colorsHelpText', {
      defaultMessage: `Define the color to use for a specific series`,
    }),
    hideLegend: i18n.translate(
      'xpack.canvas.functions.savedVisualization.args.hideLegendHelpText',
      {
        defaultMessage: `Should the legend be hidden`,
      }
    ),
  },
};
