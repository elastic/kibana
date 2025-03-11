/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTIONS_PANEL_ID } from './addon/constants';

export * from './decorators';
export { ACTIONS_PANEL_ID } from './addon/constants';

export const getAddonPanelParameters = () => ({ options: { selectedPanel: ACTIONS_PANEL_ID } });

export const getDisableStoryshotsParameter = () => ({
  storyshots: {
    disable: true,
  },
});
