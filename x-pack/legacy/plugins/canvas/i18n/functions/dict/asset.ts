/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { asset } from '../../../public/functions/asset';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof asset>> = {
  help: i18n.translate('xpack.canvas.functions.assetHelpText', {
    defaultMessage:
      'Retrieves Canvas workpad asset objects to provide as argument values. Usually images.',
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.asset.args.id', {
      defaultMessage: 'The ID of the asset to retrieve.',
    }),
  },
};

export const errors = {
  invalidAssetId: (assetId: string) =>
    new Error(
      i18n.translate('xpack.canvas.functions.asset.invalidAssetId', {
        defaultMessage: "Could not get the asset by ID: '{assetId}'",
        values: { assetId },
        description:
          'This error occurs when there is no asset object associated with the given ID.',
      })
    ),
};
