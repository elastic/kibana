/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../../i18n';

const { Timefilter: strings } = ViewStrings;

export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: strings.getDisplayName(),
  modelArgs: [],
  args: [
    {
      name: 'column',
      displayName: strings.getColumnDisplayName(),
      help: strings.getColumnHelp(),
      argType: 'string',
      options: {
        confirm: strings.getColumnConfirm(),
      },
    },
    {
      name: 'filterGroup',
      displayName: strings.getFilterGroupDisplayName(),
      help: strings.getFilterGroupHelp(),
      argType: 'filterGroup',
    },
  ],
});
