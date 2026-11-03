/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { PluginConfig } from '../../../config';
import { ConfigService } from './config_service';

/**
 * Builds a real {@link ConfigService} backed by the given config, so tests
 * exercise the actual path-based `get` resolution.
 */
export const createConfigService = (config: PluginConfig): ConfigService =>
  new ConfigService({
    get: () => config,
  } as unknown as PluginInitializerContext<PluginConfig>['config']);
