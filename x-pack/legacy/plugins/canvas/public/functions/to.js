/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { castProvider } from '@kbn/interpreter/common';
import { registries } from 'plugins/interpreter/registries';

export const to = () => ({
  name: 'to',
  aliases: [],
  help: 'Explicitly cast from one type to another',
  context: {},
  args: {
    type: {
      types: ['string'],
      help: 'A known type',
      aliases: ['_'],
      multi: true,
    },
  },
  fn: (context, args) => {
    if (!args.type) {
      throw new Error('Must specify a casting type');
    }

    return castProvider(registries.types.toJS())(context, args.type);
  },
});
