/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, IUiSettingsClient } from '@kbn/core/server';
import type { ModelSettingsConfigClient } from './model_settings_config_client';
import { ModelSettingsConfigClientImpl } from './model_settings_config_client';

export type { ModelSettings, ModelSettingsConfigClient } from './model_settings_config_client';

export class ModelSettingsConfigService {
  constructor(private readonly logger: Logger) {}

  getClient({
    soClient,
    globalUiSettingsClient,
  }: {
    soClient: SavedObjectsClientContract;
    globalUiSettingsClient: IUiSettingsClient;
  }): ModelSettingsConfigClient {
    const clientLogger = this.logger.get('model-settings-config-client');
    return new ModelSettingsConfigClientImpl(soClient, globalUiSettingsClient, clientLogger);
  }
}
