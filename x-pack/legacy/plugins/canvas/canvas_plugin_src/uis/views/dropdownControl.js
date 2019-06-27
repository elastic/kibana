/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const dropdownControl = () => ({
  name: 'dropdownControl',
  displayName: 'Dropdown filter',
  modelArgs: [],
  args: [
    {
      name: 'valueColumn',
      displayName: 'Values column',
      help: 'Column from which to extract values to make available in the dropdown',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterColumn',
      displayName: 'Filter column',
      help: 'Column to which the value selected from the dropdown is applied',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterGroup',
      displayName: 'Filter group name',
      help: "Apply the selected group name to an element's filters function to target this filter",
      argType: 'filterGroup',
    },
  ],
});
