/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { ADVANCED_SETTINGS_CONFIG } from './settings';

export const registerUiSettings = (core: CoreSetup) => {
  core.uiSettings.register(ADVANCED_SETTINGS_CONFIG);
};
