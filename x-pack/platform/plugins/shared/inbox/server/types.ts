/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export type InboxPluginSetup = Record<string, never>;
export type InboxPluginStart = Record<string, never>;

export interface InboxSetupDependencies {
  features: FeaturesPluginSetup;
}

export type InboxStartDependencies = Record<string, never>;

export type InboxRouter = IRouter;
