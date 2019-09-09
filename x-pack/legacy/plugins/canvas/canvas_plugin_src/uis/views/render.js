/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_ELEMENT_CSS } from '../../../common/lib/constants';
import { CSS } from '../../../i18n/constants';
import { ViewStrings } from '../../strings';

export const render = () => ({
  name: 'render',
  displayName: ViewStrings.Render.getDisplayName(),
  help: ViewStrings.Render.getHelp(),
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
      help: ViewStrings.Render.args.CSS.getHelp(),
      argType: 'textarea',
      default: `"${DEFAULT_ELEMENT_CSS}"`,
      options: {
        confirm: ViewStrings.Render.args.CSS.getApply(),
      },
    },
  ],
});
