/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';

class VaultUnavailableError extends AggregateError {
  constructor(originalError: Error) {
    super([originalError], `Vault is not available. See https://docs.elastic.dev/vault.`);
  }
}

class VaultAccessError extends AggregateError {
  constructor(field: string, originalError: Error) {
    super([originalError], `Could not get vault field ${field}`);
  }
}

async function getBedrockCreditsFromVault() {
  await execa.command(`which vault`).catch((error) => {
    throw new VaultUnavailableError(error);
  });

  async function readVault(field: string, path: string): Promise<string> {
    return await execa
      .command(`vault read -field ${field} ${path}`)
      .then((value) => {
        return value.stdout;
      })
      .catch((error) => {
        throw new VaultAccessError(field, error);
      });
  }

  const vaultPath = 'secret/ent-search-team/inference/eis-gateway/dev';

  const accessKeyId = await readVault('bedrock-aws-access-key-id', vaultPath);
  const secretAccessKey = await readVault('bedrock-aws-secret-access-key', vaultPath);

  return {
    accessKeyId,
    secretAccessKey,
  };
}

export interface AwsBedrockConfig {
  region: string;
  modelId: string;
  apiEndpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export async function getBedrockConfig({ log }: { log: ToolingLog }): Promise<AwsBedrockConfig> {
  log.debug(`Checking for Bedrock config`);

  const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY;
  const region = process.env.AWS_BEDROCK_REGION ?? 'us-west-2';
  const modelId = process.env.AWS_BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const apiEndpoint =
    (process.env.AWS_BEDROCK_API_ENDPOINT = `https://bedrock-runtime.${region}.amazonaws.com`);

  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey, region, modelId, apiEndpoint };
  }

  log.debug(`No bedrock credentials found in env, checking Vault`);

  return {
    region,
    modelId,
    apiEndpoint,
    ...(await getBedrockCreditsFromVault()),
  };
}
