/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type {
  AgentAction,
  NewAgentAction,
  SecretReference,
  SOSecretPath,
} from '../../../common/types';
import { ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';

import {
  deleteSOSecrets,
  extractAndWriteSOSecrets,
  isSecretStorageEnabledForFeature,
} from './common';

export async function isActionSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isSecretStorageEnabledForFeature({
    esClient,
    soClient,
    featureName: 'Action secrets',
    minimumFleetServerVersion: ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'action_secret_storage_requirements_met',
  });
}

/**
 * Given a new agent action, extracts the secrets, stores them in saved objects,
 * and returns the action with secrets replaced by references to the saved objects.
 */
export async function extractAndWriteActionSecrets(opts: {
  action: NewAgentAction;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ actionWithSecrets: NewAgentAction; secretReferences: SecretReference[] }> {
  const { action, esClient, secretHashes = {} } = opts;
  const secretPaths = getActionSecretPaths(action).filter((path) => typeof path.value === 'string');
  const secretRes = await extractAndWriteSOSecrets<NewAgentAction>({
    soObject: action,
    secretPaths,
    esClient,
    secretHashes,
  });
  return {
    actionWithSecrets: secretRes.soObjectWithSecrets,
    secretReferences: secretRes.secretReferences,
  };
}

/**
 * Deletes secrets for a given agent action.
 * This function is currently not used, but implemented for completeness.
 */
export async function deleteActionSecrets(opts: {
  action: AgentAction;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { action, esClient } = opts;
  await deleteSOSecrets(esClient, getActionSecretPaths(action));
}

/**
 * Helper function to get the secret paths for an agent action.
 */
function getActionSecretPaths(action: NewAgentAction): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (action?.secrets?.user_info?.password) {
    secretPaths.push({
      path: 'secrets.user_info.password',
      value: action.secrets.user_info.password,
    });
  }
  if (action?.secrets?.enrollment_token) {
    secretPaths.push({
      path: 'secrets.enrollment_token',
      value: action.secrets.enrollment_token,
    });
  }

  return secretPaths;
}
