/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const multifilterControl = () => ({
  name: 'multifilterControl',
  displayName: 'Multiple filters',
  modelArgs: [],
  args: [
    {
      name: 'columns',
      displayName: 'Column name',
      help: 'Select the columns from which values will be displayed as filters.',
      argType: 'string',
      multi: true,
    },
    {
      name: 'filterGroup',
      displayName: 'Filter group',
      help: "Apply the selected group name to an element's filters function to target this filter",
      argType: 'filterGroup',
    },
  ],
});
