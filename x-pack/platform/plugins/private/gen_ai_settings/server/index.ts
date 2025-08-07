/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenAiSettingsPlugin } from './plugin';
import { config } from '../common/config';

export function plugin() {
  return new GenAiSettingsPlugin();
}

export { config };

export type { GenAiSettingsPluginSetup, GenAiSettingsPluginStart } from './plugin';
export type { GenAiSettingsConfigType } from '../common/config';
