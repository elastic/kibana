/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { SavedObjectsClientContract } from 'src/core/server';
import {
  MONITORING_CONFIG_SAVED_OBJECT_ID,
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
} from '../../../common/constants';

export async function fetchDefaultEmailAddress(
  savedObjectsClient: SavedObjectsClientContract
): Promise<string> {
  const monitoringConfig = await savedObjectsClient.get(
    'config',
    MONITORING_CONFIG_SAVED_OBJECT_ID
  );
  const emailAddress = get(
    monitoringConfig,
    `attributes.${MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS}`
  ) as string;
  return emailAddress;
}
