/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { savedMap } from '../../functions/common/saved_map';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof savedMap>> = {
  help: i18n.translate('xpack.canvas.functions.savedMapHelpText', {
    defaultMessage: `Returns an embeddable for a saved map object`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.savedMap.args.idHelpText', {
      defaultMessage: `The id of the saved map object`,
    }),
    center: i18n.translate('xpack.canvas.functions.savedMap.args.centerHelpText', {
      defaultMessage: 'The initial center point and zoom level for the map',
    }),
    showLayersMenu: i18n.translate('xpack.canvas.functions.savedMap.args.showLayersMenuHelpText', {
      defaultMessage: `Whether the layers menu should show or be collapsed`,
    }),
    title: i18n.translate('xpack.canvas.functions.savedMap.args.titleHelpText', {
      defaultMessage: `The title for the displayed panel`,
    }),
  },
};
