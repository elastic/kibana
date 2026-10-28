/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { NewFleetServerHost, FleetServerHost, SOSecretPath } from '../../../common/types';
import type { SecretReference } from '../../types';

import {
  deleteSOSecrets,
  extractAndWriteSOSecrets,
  extractAndUpdateSOSecrets,
  withClearedSecretReferences,
} from './common';
import type { DeletedSOSecret } from './common';
import type { SecretFieldDefinition } from './preserve';

/**
 * The credentials a Fleet Server host can store as a secret, so that an update that does not touch
 * one of them keeps it (see `withSavedSecrets`). Each one is removed by an explicit `null`, either
 * of the credential itself or of the whole `ssl` object.
 */
export const FLEET_SERVER_HOST_SECRET_FIELDS: SecretFieldDefinition[] = [
  { secretPath: 'secrets.ssl.key', plainPath: 'ssl.key', clearedBy: ['ssl'] },
  { secretPath: 'secrets.ssl.es_key', plainPath: 'ssl.es_key', clearedBy: ['ssl'] },
  { secretPath: 'secrets.ssl.agent_key', plainPath: 'ssl.agent_key', clearedBy: ['ssl'] },
];

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
  secretsToDelete: DeletedSOSecret[];
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
    // a deleted secret has its reference removed too, or the host would point at a secret that no
    // longer exists
    fleetServerHostUpdate: withClearedSecretReferences(
      secretsRes.updatedSoObject,
      secretsRes.secretsToDelete
    ),
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

  if (fleetServerHost.secrets?.ssl?.key && typeof fleetServerHost.secrets?.ssl?.key === 'object') {
    secretPaths.push({
      id: fleetServerHost.secrets.ssl.key.id,
    });
  }
  if (
    fleetServerHost.secrets?.ssl?.es_key &&
    typeof fleetServerHost.secrets?.ssl?.es_key === 'object'
  ) {
    secretPaths.push({
      id: fleetServerHost.secrets.ssl.es_key.id,
    });
  }
  if (
    fleetServerHost.secrets?.ssl?.agent_key &&
    typeof fleetServerHost.secrets?.ssl?.agent_key === 'object'
  ) {
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
