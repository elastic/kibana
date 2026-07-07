/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { SOSecretPath, DownloadSource, DownloadSourceBase } from '../../../common/types';
import type { SecretReference } from '../../types';
import { DOWNLOAD_SOURCE_AUTH_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';

import {
  deleteSOSecrets,
  extractAndWriteSOSecrets,
  extractAndUpdateSOSecrets,
  isSecretStorageEnabledForFeature,
} from './common';

export async function isDownloadSourceAuthSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isSecretStorageEnabledForFeature({
    esClient,
    soClient,
    featureName: 'Download source auth secrets',
    minimumFleetServerVersion: DOWNLOAD_SOURCE_AUTH_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'download_source_auth_secret_storage_requirements_met',
  });
}

export interface ExtractDownloadSourceSecretsOptions {
  downloadSource: DownloadSourceBase;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
  /**
   * If true, SSL secrets will be extracted and stored as secrets.
   * If false or undefined, SSL secrets will not be processed.
   */
  includeSSLSecrets?: boolean;
  /**
   * If true, auth secrets will be extracted and stored as secrets.
   * If false or undefined, auth secrets will not be processed.
   */
  includeAuthSecrets?: boolean;
}

export async function extractAndWriteDownloadSourcesSecrets(
  opts: ExtractDownloadSourceSecretsOptions
): Promise<{ downloadSource: DownloadSourceBase; secretReferences: SecretReference[] }> {
  const {
    downloadSource,
    esClient,
    secretHashes = {},
    includeSSLSecrets = false,
    includeAuthSecrets = false,
  } = opts;

  const secretPaths = getDownloadSourcesSecretPaths(downloadSource, {
    includeSSLSecrets,
    includeAuthSecrets,
  }).filter((path) => typeof path.value === 'string');
  const secretRes = await extractAndWriteSOSecrets<DownloadSourceBase>({
    soObject: downloadSource,
    secretPaths,
    esClient,
    secretHashes,
  });
  return {
    downloadSource: secretRes.soObjectWithSecrets,
    secretReferences: secretRes.secretReferences,
  };
}

export interface UpdateDownloadSourceSecretsOptions {
  oldDownloadSource: DownloadSourceBase;
  downloadSourceUpdate: Partial<DownloadSourceBase>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
  /**
   * If true, SSL secrets will be extracted and stored as secrets.
   * If false or undefined, SSL secrets will not be processed.
   */
  includeSSLSecrets?: boolean;
  /**
   * If true, auth secrets will be extracted and stored as secrets.
   * If false or undefined, auth secrets will not be processed.
   */
  includeAuthSecrets?: boolean;
}

export async function extractAndUpdateDownloadSourceSecrets(
  opts: UpdateDownloadSourceSecretsOptions
): Promise<{
  downloadSourceUpdate: Partial<DownloadSourceBase>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const {
    oldDownloadSource,
    downloadSourceUpdate,
    esClient,
    secretHashes,
    includeSSLSecrets = false,
    includeAuthSecrets = false,
  } = opts;
  const secretPathOptions = { includeSSLSecrets, includeAuthSecrets };
  const oldSecretPaths = getDownloadSourcesSecretPaths(oldDownloadSource, secretPathOptions);
  const updatedSecretPaths = getDownloadSourcesSecretPaths(downloadSourceUpdate, secretPathOptions);
  const secretsRes = await extractAndUpdateSOSecrets<DownloadSourceBase>({
    updatedSoObject: downloadSourceUpdate,
    oldSecretPaths,
    updatedSecretPaths,
    esClient,
    secretHashes,
  });
  return {
    downloadSourceUpdate: secretsRes.updatedSoObject,
    secretReferences: secretsRes.secretReferences,
    secretsToDelete: secretsRes.secretsToDelete,
  };
}

export async function deleteDownloadSourceSecrets(opts: {
  downloadSource: DownloadSourceBase;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { downloadSource, esClient } = opts;
  // When deleting, we want to find all secrets regardless of current feature flags
  const secretPaths = getDownloadSourcesSecretPaths(downloadSource, {
    includeSSLSecrets: true,
    includeAuthSecrets: true,
  });
  await deleteSOSecrets(esClient, secretPaths);
}

export function getDownloadSourceSecretReferences(
  downloadSource: DownloadSource
): SecretReference[] {
  const secretPaths: SecretReference[] = [];

  // SSL secrets
  if (typeof downloadSource.secrets?.ssl?.key === 'object') {
    secretPaths.push({
      id: downloadSource.secrets.ssl.key.id,
    });
  }

  // Auth secrets (username is not a secret, only password and api_key)
  if (downloadSource.secrets?.auth) {
    if (typeof downloadSource.secrets.auth.password === 'object') {
      secretPaths.push({
        id: downloadSource.secrets.auth.password.id,
      });
    }
    if (typeof downloadSource.secrets.auth.api_key === 'object') {
      secretPaths.push({
        id: downloadSource.secrets.auth.api_key.id,
      });
    }
  }

  return secretPaths;
}

interface GetDownloadSourcesSecretPathsOptions {
  includeSSLSecrets?: boolean;
  includeAuthSecrets?: boolean;
}

function getDownloadSourcesSecretPaths(
  downloadSource: DownloadSource | Partial<DownloadSource>,
  options: GetDownloadSourcesSecretPathsOptions = {}
): SOSecretPath[] {
  const { includeSSLSecrets = false, includeAuthSecrets = false } = options;
  const secretPaths: SOSecretPath[] = [];

  // SSL secrets
  if (includeSSLSecrets && downloadSource?.secrets?.ssl?.key) {
    secretPaths.push({
      path: 'secrets.ssl.key',
      value: downloadSource.secrets.ssl.key,
    });
  }

  // Auth secrets (username is not a secret, only password and api_key)
  if (includeAuthSecrets) {
    // Check secrets.auth paths first
    if (downloadSource?.secrets?.auth) {
      if (downloadSource.secrets.auth.password) {
        secretPaths.push({
          path: 'secrets.auth.password',
          value: downloadSource.secrets.auth.password,
        });
      }
      if (downloadSource.secrets.auth.api_key) {
        secretPaths.push({
          path: 'secrets.auth.api_key',
          value: downloadSource.secrets.auth.api_key,
        });
      }
    }

    // Also convert plain text auth values to secrets when secret storage is enabled
    // Only if not already specified in secrets.auth (to avoid duplicates)
    if (downloadSource?.auth) {
      if (downloadSource.auth.password && !downloadSource?.secrets?.auth?.password) {
        secretPaths.push({
          path: 'secrets.auth.password',
          value: downloadSource.auth.password,
        });
      }
      if (downloadSource.auth.api_key && !downloadSource?.secrets?.auth?.api_key) {
        secretPaths.push({
          path: 'secrets.auth.api_key',
          value: downloadSource.auth.api_key,
        });
      }
    }
  }

  return secretPaths;
}
