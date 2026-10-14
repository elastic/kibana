/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import { ENABLE_KAFKA_OAUTH2_AUTH_FLAG } from '../../../common/constants';
import { appContextService } from '../app_context';

const isFlagEnabled = async (flag: string): Promise<boolean> => {
  const featureFlags = appContextService.getFeatureFlags();
  if (!featureFlags) {
    return false;
  }

  return await firstValueFrom(featureFlags.getBooleanValue$(flag, false));
};

/** Whether the OAuth2 authentication method of the Kafka output is enabled. */
export const isKafkaOAuth2AuthEnabled = (): Promise<boolean> =>
  isFlagEnabled(ENABLE_KAFKA_OAUTH2_AUTH_FLAG);
