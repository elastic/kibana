/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { SOSecretPath, DownloadSource, DownloadSourceBase } from '../../../common/types';
import type { SecretReference } from '../../types';

import { deleteSOSecrets, extractAndWriteSOSecrets, extractAndUpdateSOSecrets } from './common';

export async function extractAndWriteDownloadSourcesSecrets(opts: {
  downloadSource: DownloadSourceBase;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ downloadSource: DownloadSourceBase; secretReferences: SecretReference[] }> {
  const { downloadSource, esClient, secretHashes = {} } = opts;

  const secretPaths = getDownloadSourcesSecretPaths(downloadSource).filter(
    (path) => typeof path.value === 'string'
  );
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

export async function extractAndUpdateDownloadSourceSecrets(opts: {
  oldDownloadSource: DownloadSourceBase;
  downloadSourceUpdate: Partial<DownloadSourceBase>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  downloadSourceUpdate: Partial<DownloadSourceBase>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { oldDownloadSource, downloadSourceUpdate, esClient, secretHashes } = opts;
  const oldSecretPaths = getDownloadSourcesSecretPaths(oldDownloadSource);
  const updatedSecretPaths = getDownloadSourcesSecretPaths(downloadSourceUpdate);
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
  const secretPaths = getDownloadSourcesSecretPaths(downloadSource);
  await deleteSOSecrets(esClient, secretPaths);
}

export function getDownloadSourceSecretReferences(
  downloadSource: DownloadSource
): SecretReference[] {
  const secretPaths: SecretReference[] = [];

  if (typeof downloadSource.secrets?.ssl?.key === 'object') {
    secretPaths.push({
      id: downloadSource.secrets.ssl.key.id,
    });
  }
  return secretPaths;
}

function getDownloadSourcesSecretPaths(
  downloadSource: DownloadSource | Partial<DownloadSource>
): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (downloadSource?.secrets?.ssl?.key) {
    secretPaths.push({
      path: 'secrets.ssl.key',
      value: downloadSource.secrets.ssl.key,
    });
  }
  return secretPaths;
}
