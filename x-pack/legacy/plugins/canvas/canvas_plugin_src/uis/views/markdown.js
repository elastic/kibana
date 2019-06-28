/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Generate markup using markdown',
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: 'Markdown content',
      help: 'Markdown formatted text',
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
