/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import {
  ChangeRequestsPlugin,
  type ChangeRequestsRepositoryClient,
  type ChangeRequestsPluginSetup,
  type ChangeRequestsPluginStart,
} from './plugin';

const plugin: PluginInitializer<ChangeRequestsPluginSetup, ChangeRequestsPluginStart> = () =>
  new ChangeRequestsPlugin();

export { plugin };
export type { ChangeRequestsRepositoryClient };
