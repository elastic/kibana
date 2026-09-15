/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import type {
  NightshiftSourcesPublicPluginSetup,
  NightshiftSourcesPublicPluginStart,
} from './plugin';
import { NightshiftSourcesPublicPlugin } from './plugin';

export type {
  NightshiftSourcesAPIClientRequestParamsOf,
  NightshiftSourcesAPIReturnType,
  NightshiftSourcesRepositoryClient,
  NightshiftSourcesRepositoryEndpoint,
} from './api';
export type { NightshiftSourcesPublicPluginSetup, NightshiftSourcesPublicPluginStart };

export const plugin: PluginInitializer<
  NightshiftSourcesPublicPluginSetup,
  NightshiftSourcesPublicPluginStart
> = (context) => new NightshiftSourcesPublicPlugin(context);
