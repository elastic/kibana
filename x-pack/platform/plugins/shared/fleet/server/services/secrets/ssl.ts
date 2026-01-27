/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';

import { isSecretStorageEnabledForFeature } from './common';

export async function isSSLSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isSecretStorageEnabledForFeature({
    esClient,
    soClient,
    featureName: 'SSL secrets',
    minimumFleetServerVersion: SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'ssl_secret_storage_requirements_met',
  });
}
