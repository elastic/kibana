/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const rounddate = () => ({
  name: 'rounddate',
  displayName: 'Round date',
  args: [
    {
      name: '_',
      displayName: 'Format',
      argType: 'dateformat',
      help: 'Select or enter a MomentJS format to round the date',
    },
  ],
});
