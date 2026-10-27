/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContainerModule } from '@kbn/core-di';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, type NotificationCenterConfig } from './config';
import { bindContract } from './setup/bind_contract';
import { bindRoutes } from './setup/bind_routes';
import { bindServices } from './setup/bind_services';
import { bindTasks } from './setup/bind_tasks';

export type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationSubmitter,
  SubmitNotificationResult,
} from './types';

export const config: PluginConfigDescriptor<NotificationCenterConfig> = {
  schema: configSchema,
};

// core gates the plugin on xpack.notificationCenter.enabled
const pluginModule = new KibanaContainerModule((options) => {
  bindServices(options);
  bindRoutes(options);
  bindTasks(options);
  bindContract(options);
});

export { pluginModule as module };
