/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { NewFleetServerHost, FleetServerHost, SOSecretPath } from '../../../common/types';
import type { SecretReference } from '../../types';

import { deleteSOSecrets, extractAndWriteSOSecrets, extractAndUpdateSOSecrets } from './common';

export async function extractAndWriteFleetServerHostsSecrets(opts: {
  fleetServerHost: NewFleetServerHost;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ fleetServerHost: NewFleetServerHost; secretReferences: SecretReference[] }> {
  const { fleetServerHost, esClient, secretHashes = {} } = opts;

  const secretPaths = getFleetServerHostsSecretPaths(fleetServerHost);

  const secretRes = await extractAndWriteSOSecrets<NewFleetServerHost>({
    soObject: fleetServerHost,
    secretPaths,
    esClient,
    secretHashes,
  });
  return {
    fleetServerHost: secretRes.soObjectWithSecrets,
    secretReferences: secretRes.secretReferences,
  };
}

export async function extractAndUpdateFleetServerHostsSecrets(opts: {
  oldFleetServerHost: NewFleetServerHost;
  fleetServerHostUpdate: Partial<NewFleetServerHost>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  fleetServerHostUpdate: Partial<NewFleetServerHost>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { oldFleetServerHost, fleetServerHostUpdate, esClient, secretHashes } = opts;
  const oldSecretPaths = getFleetServerHostsSecretPaths(oldFleetServerHost);
  const updatedSecretPaths = getFleetServerHostsSecretPaths(fleetServerHostUpdate);
  const secretsRes = await extractAndUpdateSOSecrets<FleetServerHost>({
    updatedSoObject: fleetServerHostUpdate,
    oldSecretPaths,
    updatedSecretPaths,
    esClient,
    secretHashes,
  });
  return {
    fleetServerHostUpdate: secretsRes.updatedSoObject,
    secretReferences: secretsRes.secretReferences,
    secretsToDelete: secretsRes.secretsToDelete,
  };
}

export async function deleteFleetServerHostsSecrets(opts: {
  fleetServerHost: NewFleetServerHost;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { fleetServerHost, esClient } = opts;

  const secretPaths = getFleetServerHostsSecretPaths(fleetServerHost);
  await deleteSOSecrets(esClient, secretPaths);
}

export function getFleetServerHostsSecretReferences(
  fleetServerHost: FleetServerHost
): SecretReference[] {
  const secretPaths: SecretReference[] = [];

  if (typeof fleetServerHost.secrets?.ssl?.key === 'object') {
    secretPaths.push({
      id: fleetServerHost.secrets.ssl.key.id,
    });
  }
  if (typeof fleetServerHost.secrets?.ssl?.es_key === 'object') {
    secretPaths.push({
      id: fleetServerHost.secrets.ssl.es_key.id,
    });
  }
  if (typeof fleetServerHost.secrets?.ssl?.agent_key === 'object') {
    secretPaths.push({
      id: fleetServerHost.secrets.ssl.agent_key.id,
    });
  }

  return secretPaths;
}

function getFleetServerHostsSecretPaths(
  fleetServerHost: NewFleetServerHost | Partial<FleetServerHost>
): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (fleetServerHost?.secrets?.ssl?.key) {
    secretPaths.push({
      path: 'secrets.ssl.key',
      value: fleetServerHost.secrets.ssl.key,
    });
  }
  if (fleetServerHost?.secrets?.ssl?.es_key) {
    secretPaths.push({
      path: 'secrets.ssl.es_key',
      value: fleetServerHost.secrets.ssl.es_key,
    });
  }
  if (fleetServerHost?.secrets?.ssl?.agent_key) {
    secretPaths.push({
      path: 'secrets.ssl.agent_key',
      value: fleetServerHost.secrets.ssl.agent_key,
    });
  }

  return secretPaths;
}
