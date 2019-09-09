/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: ViewStrings.Timefilter.getDisplayName(),
  modelArgs: [],
  args: [
    {
      name: 'column',
      displayName: ViewStrings.Timefilter.args.Column.getDisplayName(),
      help: ViewStrings.Timefilter.args.Column.getHelp(),
      argType: 'string',
      options: {
        confirm: ViewStrings.Timefilter.args.Column.getConfirm(),
      },
    },
    {
      name: 'filterGroup',
      displayName: ViewStrings.Timefilter.args.FilterGroup.getDisplayName(),
      help: ViewStrings.Timefilter.args.FilterGroup.getHelp(),
      argType: 'filterGroup',
    },
  ],
});
