/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getState } from '../state/store';
import { getAssetById } from '../state/selectors/assets';

export const asset = () => ({
  name: 'asset',
  aliases: [],
  type: 'string',
  help: 'Retrieves Canvas workpad asset objects to provide as argument values. Usually images.',
  context: {
    types: ['null'],
  },
  args: {
    id: {
      aliases: ['_'],
      types: ['string'],
      help: 'The ID of the asset to retrieve.',
      required: true,
    },
  },
  fn: (_context, args) => {
    const assetId = args.id;
    const asset = getAssetById(getState(), assetId);
    if (asset !== undefined) {
      return asset.value;
    }

    throw new Error('Could not get the asset by ID: ' + assetId);
  },
});
