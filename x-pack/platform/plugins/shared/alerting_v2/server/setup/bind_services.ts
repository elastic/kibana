/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { bindClients } from './bind_clients';
import { bindDataServices } from './bind_data_services';
import { bindDispatcher } from './bind_dispatcher';
import { bindPlatformServices } from './bind_platform_services';
import { bindSavedObjects } from './bind_saved_objects';

/**
 * Composes the plugin's service/client bindings from the domain-focused modules.
 * Binding order is irrelevant: `toResolvedValue`/`toService` resolve their
 * dependencies lazily, so cross-module token references resolve once every module
 * has loaded into the shared container.
 */
export function bindServices(options: ContainerModuleLoadOptions) {
  bindClients(options);
  bindSavedObjects(options);
  bindDataServices(options);
  bindPlatformServices(options);
  bindDispatcher(options);
}
