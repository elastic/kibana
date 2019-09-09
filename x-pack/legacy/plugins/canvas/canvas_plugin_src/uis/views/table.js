/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const table = () => ({
  name: 'table',
  displayName: ViewStrings.Table.getDisplayName(),
  help: ViewStrings.Table.getHelp(),
  modelArgs: [],
  args: [
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'perPage',
      displayName: ViewStrings.Table.args.PerPage.getDisplayName(),
      help: ViewStrings.Table.args.PerPage.getHelp(),
      argType: 'select',
      default: 10,
      options: {
        choices: ['', 5, 10, 25, 50, 100].map(v => ({ name: String(v), value: v })),
      },
    },
    {
      name: 'paginate',
      displayName: ViewStrings.Table.args.Paginate.getDisplayName(),
      help: ViewStrings.Table.args.Paginate.getHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'showHeader',
      displayName: ViewStrings.Table.args.ShowHeader.getDisplayName(),
      help: ViewStrings.Table.args.ShowHeader.getHelp(),
      argType: 'toggle',
      default: true,
    },
  ],
});
