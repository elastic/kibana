/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PANEL_ID as selectedPanel } from '@storybook/addon-actions';
import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Security Form Components',
    brandUrl:
      'https://github.com/elastic/kibana/tree/main/x-pack/platform/packages/shared/security/form_components',
  }),
  selectedPanel,
  showPanel: true.valueOf,
});
