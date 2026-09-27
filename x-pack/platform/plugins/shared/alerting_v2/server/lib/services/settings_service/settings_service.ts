/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type {
  AlertingAdvancedSettingId,
  AlertingAdvancedSettingValue,
} from '@kbn/alerting-v2-constants';
import { SpaceUiSettingsClientToken } from '../../../settings/tokens';

export interface SettingsServiceContract {
  /**
   * Reads the current value of an alerting advanced setting, falling back
   * to the registered default when the user has not provided a value. The
   * return type is resolved from {@link AlertingAdvancedSettingValueMap}.
   */
  get<K extends AlertingAdvancedSettingId>(key: K): Promise<AlertingAdvancedSettingValue<K>>;
  /**
   * Persists a value for an alerting advanced setting and marks it as
   * user-provided. The accepted value type is resolved from
   * {@link AlertingAdvancedSettingValueMap}.
   */
  set<K extends AlertingAdvancedSettingId>(
    key: K,
    value: AlertingAdvancedSettingValue<K>
  ): Promise<void>;
}

@injectable()
export class SettingsService implements SettingsServiceContract {
  constructor(
    @inject(SpaceUiSettingsClientToken)
    private readonly spaceUiSettingsClient: IUiSettingsClient
  ) {}

  public async get<K extends AlertingAdvancedSettingId>(
    key: K
  ): Promise<AlertingAdvancedSettingValue<K>> {
    return this.spaceUiSettingsClient.get<AlertingAdvancedSettingValue<K>>(key);
  }

  public async set<K extends AlertingAdvancedSettingId>(
    key: K,
    value: AlertingAdvancedSettingValue<K>
  ): Promise<void> {
    await this.spaceUiSettingsClient.set(key, value);
  }
}
