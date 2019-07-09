/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const table = () => ({
  name: 'table',
  displayName: 'Table style',
  help: 'Set styling for a Table element',
  modelArgs: [],
  args: [
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'perPage',
      displayName: 'Rows per page',
      help: 'Number of rows to display per table page',
      argType: 'select',
      default: 10,
      options: {
        choices: ['', 5, 10, 25, 50, 100].map(v => ({ name: String(v), value: v })),
      },
    },
    {
      name: 'paginate',
      displayName: 'Pagination',
      help: 'Show or hide pagination controls. If disabled only the first page will be shown',
      argType: 'toggle',
      default: true,
    },
    {
      name: 'showHeader',
      displayName: 'Header',
      help: 'Show or hide the header row with titles for each column',
      argType: 'toggle',
      default: true,
    },
  ],
});
