/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../strings';

export const dropdownControl = () => ({
  name: 'dropdownControl',
  displayName: ViewStrings.DropdownControl.getDisplayName(),
  modelArgs: [],
  args: [
    {
      name: 'valueColumn',
      displayName: ViewStrings.DropdownControl.args.valueColumn.getDisplayName(),
      help: ViewStrings.DropdownControl.args.valueColumn.getHelp(),
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterColumn',
      displayName: ViewStrings.DropdownControl.args.filterColumn.getDisplayName(),
      help: ViewStrings.DropdownControl.args.filterColumn.getHelp(),
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterGroup',
      displayName: ViewStrings.DropdownControl.args.filterGroup.getDisplayName(),
      help: ViewStrings.DropdownControl.args.filterGroup.getHelp(),
      argType: 'filterGroup',
    },
  ],
});
