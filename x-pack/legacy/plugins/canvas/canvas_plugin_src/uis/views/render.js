/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_ELEMENT_CSS } from '../../../common/lib/constants';
import { CSS } from '../../../i18n/constants';
import { ViewStrings } from '../../../i18n';

const { Render: strings } = ViewStrings;

export const render = () => ({
  name: 'render',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: 'containerStyle',
      argType: 'containerStyle',
    },
    {
      name: 'css',
      displayName: CSS,
      help: strings.getCssHelp(),
      argType: 'textarea',
      default: `"${DEFAULT_ELEMENT_CSS}"`,
      options: {
        confirm: strings.getCssApply(),
      },
    },
  ],
});
