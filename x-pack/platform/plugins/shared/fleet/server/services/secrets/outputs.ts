/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { SOSecretPath, Output } from '../../../common/types';
import type { NewOutput } from '../../../common';
import { isBeatsOutput, isOtlpOutput } from '../../../common/services/output_helpers';
import type { SecretReference } from '../../types';
import { OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';

import {
  deleteSOSecrets,
  extractAndWriteSOSecrets,
  extractAndUpdateSOSecrets,
  isSecretStorageEnabledForFeature,
} from './common';

export async function isOutputSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isSecretStorageEnabledForFeature({
    esClient,
    soClient,
    featureName: 'Output secrets',
    minimumFleetServerVersion: OUTPUT_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'output_secret_storage_requirements_met',
  });
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

  if (isBeatsOutput(output) && typeof output.secrets?.ssl?.key === 'object') {
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

  if (isOtlpOutput(output)) {
    if (typeof output.secrets?.otlp_exporter?.tls?.key_pem === 'object') {
      outputSecretPaths.push({ id: output.secrets.otlp_exporter.tls.key_pem.id });
    }
    if (typeof output.secrets?.otlp_exporter?.tls?.tpm?.owner_auth === 'object') {
      outputSecretPaths.push({ id: output.secrets.otlp_exporter.tls.tpm.owner_auth.id });
    }
    if (typeof output.secrets?.otlp_exporter?.tls?.tpm?.auth === 'object') {
      outputSecretPaths.push({ id: output.secrets.otlp_exporter.tls.tpm.auth.id });
    }
  }

  return outputSecretPaths;
}

function getOutputSecretPaths(
  outputType: NewOutput['type'],
  output: NewOutput | Partial<Output>
): SOSecretPath[] {
  const outputSecretPaths: SOSecretPath[] = [];
  const typed = { ...output, type: outputType } as NewOutput;

  if (typed.type === 'kafka') {
    if (typed.secrets?.password) {
      outputSecretPaths.push({ path: 'secrets.password', value: typed.secrets.password });
    }
  }

  if (typed.type === 'remote_elasticsearch') {
    if (typed.secrets?.service_token) {
      outputSecretPaths.push({ path: 'secrets.service_token', value: typed.secrets.service_token });
    }
  }

  if (isOtlpOutput(typed)) {
    if (typed.secrets?.otlp_exporter?.tls?.key_pem) {
      outputSecretPaths.push({
        path: 'secrets.otlp_exporter.tls.key_pem',
        value: typed.secrets.otlp_exporter.tls.key_pem,
      });
    }
    if (typed.secrets?.otlp_exporter?.tls?.tpm?.owner_auth) {
      outputSecretPaths.push({
        path: 'secrets.otlp_exporter.tls.tpm.owner_auth',
        value: typed.secrets.otlp_exporter.tls.tpm.owner_auth,
      });
    }
    if (typed.secrets?.otlp_exporter?.tls?.tpm?.auth) {
      outputSecretPaths.push({
        path: 'secrets.otlp_exporter.tls.tpm.auth',
        value: typed.secrets.otlp_exporter.tls.tpm.auth,
      });
    }
  }

  if (isBeatsOutput(typed) && typed.secrets?.ssl?.key) {
    outputSecretPaths.push({ path: 'secrets.ssl.key', value: typed.secrets.ssl.key });
  }

  return outputSecretPaths;
}
