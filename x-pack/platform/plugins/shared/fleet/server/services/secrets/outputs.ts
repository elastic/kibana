/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type {
  SOSecretPath,
  KafkaOutput,
  NewRemoteElasticsearchOutput,
  Output,
} from '../../../common/types';
import type { NewOutput } from '../../../common';
import type { SecretReference } from '../../types';
import { OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';
import { appContextService } from '../app_context';
import { settingsService } from '..';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';

import { deleteSOSecrets, extractAndWriteSOSecrets, extractAndUpdateSOSecrets } from './common';

export async function isOutputSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  const logger = appContextService.getLogger();

  // if serverless then output secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace('Output secrets storage is enabled as fleet server is standalone');
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, output secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings.output_secret_storage_requirements_met) {
    logger.debug('Output secrets storage requirements already met, turned on in settings');
    return true;
  }

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (
    await checkFleetServerVersionsForSecretsStorage(
      esClient,
      soClient,
      OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION
    )
  ) {
    logger.debug('Enabling output secrets storage as minimum fleet server version has been met');
    try {
      await settingsService.saveSettings(soClient, {
        output_secret_storage_requirements_met: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling output secrets storage: ${err.message}`);
    }

    return true;
  }

  logger.info('Secrets storage is disabled as minimum fleet server version has not been met');
  return false;
}

export async function extractAndWriteOutputSecrets(opts: {
  output: NewOutput;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ output: NewOutput; secretReferences: SecretReference[] }> {
  const { output, esClient, secretHashes = {} } = opts;
  const secretPaths = getOutputSecretPaths(output.type, output).filter(
    (path) => typeof path.value === 'string'
  );
  const secretRes = await extractAndWriteSOSecrets<NewOutput>({
    soObject: output,
    secretPaths,
    esClient,
    secretHashes,
  });
  return { output: secretRes.soObjectWithSecrets, secretReferences: secretRes.secretReferences };
}

export async function extractAndUpdateOutputSecrets(opts: {
  oldOutput: Output;
  outputUpdate: Partial<Output>;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  outputUpdate: Partial<Output>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { oldOutput, outputUpdate, esClient, secretHashes } = opts;
  const outputType = outputUpdate.type || oldOutput.type;
  const oldSecretPaths = getOutputSecretPaths(oldOutput.type, oldOutput);
  const updatedSecretPaths = getOutputSecretPaths(outputType, outputUpdate);

  const secretRes = await extractAndUpdateSOSecrets<Output>({
    updatedSoObject: outputUpdate,
    oldSecretPaths,
    updatedSecretPaths,
    esClient,
    secretHashes: outputUpdate.is_preconfigured ? secretHashes : undefined,
  });
  return {
    outputUpdate: secretRes.updatedSoObject,
    secretReferences: secretRes.secretReferences,
    secretsToDelete: secretRes.secretsToDelete,
  };
}

export async function deleteOutputSecrets(opts: {
  output: Output;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { output, esClient } = opts;

  const outputType = output.type;
  const outputSecretPaths = getOutputSecretPaths(outputType, output);

  await deleteSOSecrets(esClient, outputSecretPaths);
}

export function getOutputSecretReferences(output: Output): SecretReference[] {
  const outputSecretPaths: SecretReference[] = [];

  if (typeof output.secrets?.ssl?.key === 'object') {
    outputSecretPaths.push({
      id: output.secrets.ssl.key.id,
    });
  }

  if (output.type === 'kafka' && typeof output?.secrets?.password === 'object') {
    outputSecretPaths.push({
      id: output.secrets.password.id,
    });
  }

  if (output.type === 'remote_elasticsearch') {
    if (typeof output?.secrets?.service_token === 'object') {
      outputSecretPaths.push({
        id: output.secrets.service_token.id,
      });
    }
  }

  return outputSecretPaths;
}

function getOutputSecretPaths(
  outputType: NewOutput['type'],
  output: NewOutput | Partial<Output>
): SOSecretPath[] {
  const outputSecretPaths: SOSecretPath[] = [];

  if (outputType === 'kafka') {
    const kafkaOutput = output as KafkaOutput;
    if (kafkaOutput?.secrets?.password) {
      outputSecretPaths.push({
        path: 'secrets.password',
        value: kafkaOutput.secrets.password,
      });
    }
  }

  if (outputType === 'remote_elasticsearch') {
    const remoteESOutput = output as NewRemoteElasticsearchOutput;
    if (remoteESOutput.secrets?.service_token) {
      outputSecretPaths.push({
        path: 'secrets.service_token',
        value: remoteESOutput.secrets.service_token,
      });
    }
  }

  // common to all outputs
  if (output?.secrets?.ssl?.key) {
    outputSecretPaths.push({
      path: 'secrets.ssl.key',
      value: output.secrets.ssl.key,
    });
  }

  return outputSecretPaths;
}
