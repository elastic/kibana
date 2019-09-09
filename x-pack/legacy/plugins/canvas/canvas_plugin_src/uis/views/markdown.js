/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const markdown = () => ({
  name: 'markdown',
  displayName: ViewStrings.Markdown.getDisplayName(),
  help: ViewStrings.Markdown.getHelp(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: ViewStrings.Markdown.args.content.getDisplayName(),
      help: ViewStrings.Markdown.args.content.getHelp(),
      argType: 'textarea',
      default: '""',
      options: {
        confirm: 'Apply',
      },
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
  ],
});
