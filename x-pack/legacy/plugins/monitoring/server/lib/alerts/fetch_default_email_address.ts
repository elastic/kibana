/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'src/core/server';
import { MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS } from '../../../common/constants';

export async function fetchDefaultEmailAddress(
  uiSettingsClient: IUiSettingsClient
): Promise<string> {
  return await uiSettingsClient.get(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS);
}
