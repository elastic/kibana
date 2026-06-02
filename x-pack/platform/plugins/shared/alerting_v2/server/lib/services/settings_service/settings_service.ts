/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type {
  AlertingV2AdvancedSettingId,
  AlertingV2AdvancedSettingValue,
} from '../../../../common/advanced_settings';
import { UiSettingsClientToken } from './tokens';

export interface SettingsServiceContract {
  /**
   * Reads the current value of an alerting v2 advanced setting, falling back
   * to the registered default when the user has not provided a value. The
   * return type is resolved from {@link AlertingV2AdvancedSettingValueMap}.
   */
  get<K extends AlertingV2AdvancedSettingId>(key: K): Promise<AlertingV2AdvancedSettingValue<K>>;
  /**
   * Persists a value for an alerting v2 advanced setting and marks it as
   * user-provided. The accepted value type is resolved from
   * {@link AlertingV2AdvancedSettingValueMap}.
   */
  set<K extends AlertingV2AdvancedSettingId>(
    key: K,
    value: AlertingV2AdvancedSettingValue<K>
  ): Promise<void>;
}

@injectable()
export class SettingsService implements SettingsServiceContract {
  constructor(
    @inject(UiSettingsClientToken)
    private readonly uiSettingsClient: IUiSettingsClient
  ) {}

  public async get<K extends AlertingV2AdvancedSettingId>(
    key: K
  ): Promise<AlertingV2AdvancedSettingValue<K>> {
    return this.uiSettingsClient.get<AlertingV2AdvancedSettingValue<K>>(key);
  }

  public async set<K extends AlertingV2AdvancedSettingId>(
    key: K,
    value: AlertingV2AdvancedSettingValue<K>
  ): Promise<void> {
    await this.uiSettingsClient.set(key, value);
  }
}
