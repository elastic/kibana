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
    id: 'The id of the saved visualization object',
  },
};
