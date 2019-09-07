/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticLogo } from '../../lib/elastic_logo';
import { resolveFromArgs } from '../../../common/lib/resolve_dataurl';
import { ViewStrings } from '../../strings';

export const image = () => ({
  name: 'image',
  displayName: ViewStrings.Image.getDisplayName(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: 'dataurl',
      argType: 'imageUpload',
      resolve({ args }) {
        return { dataurl: resolveFromArgs(args, elasticLogo) };
      },
    },
    {
      name: 'mode',
      displayName: ViewStrings.Image.args.mode.getDisplayName(),
      help: ViewStrings.Image.args.mode.getHelp(),
      argType: 'select',
      options: {
        choices: [
          { value: 'contain', name: ViewStrings.Image.args.mode.options.contain() },
          { value: 'cover', name: ViewStrings.Image.args.mode.options.cover() },
          { value: 'stretch', name: ViewStrings.Image.args.mode.options.stretch() },
        ],
      },
    },
  ],
});
