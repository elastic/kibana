/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../../i18n';

const { Markdown: strings } = ViewStrings;

export const markdown = () => ({
  name: 'markdown',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: strings.getContentDisplayName(),
      help: strings.getContentHelp(),
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
