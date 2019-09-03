/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export const advancedUiActions = (kibana: any) =>
  new kibana.Plugin({
    id: 'advanced_ui_actions',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      hacks: 'plugins/advanced_ui_actions/np_ready/public/legacy',
    },
  });
