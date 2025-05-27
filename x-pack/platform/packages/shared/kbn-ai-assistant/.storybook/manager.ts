/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';
import { addons } from '@storybook/manager-api';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'AI Assistant Storybook',
    brandUrl:
      'https://github.com/elastic/kibana/tree/main/x-pack/platform/packages/shared/kbn-ai-assistant',
  }),
  showPanel: true.valueOf,
  selectedPanel: PANEL_ID,
});
