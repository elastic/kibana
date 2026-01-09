/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { PluginConfig } from './config';
import { configSchema } from './config';
import { bindOnSetup } from './di/bind_on_setup';
import { bindRoutes } from './di/bind_routes';
import { bindServices } from './di/bind_services';

export const config: PluginConfigDescriptor<PluginConfig> = {
  schema: configSchema,
};

export const module = new ContainerModule((options) => {
  bindRoutes(options);
  bindServices(options);
  bindOnSetup(options);
});

export type { PluginConfig as AlertingV2Config } from './config';
