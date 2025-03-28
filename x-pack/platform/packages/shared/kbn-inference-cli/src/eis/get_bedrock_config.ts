/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { pickBy } from 'lodash';

class VaultUnavailableError extends AggregateError {
  constructor(originalError: Error) {
    super([originalError], `Vault is not available. See https://docs.elastic.dev/vault.`);
  }
}

class VaultTimedOutError extends AggregateError {
  constructor(originalError: Error) {
    super(
      [originalError],
      `Vault timed out. Make sure you are connected to the VPN. See https://docs.elastic.dev/vault.`
    );
  }
}

class VaultAccessError extends AggregateError {
  constructor(originalError: Error) {
    super([originalError], `Could not read from Vault`);
  }
}

async function getBedrockCreditsFromVault() {
  await execa.command(`which vault`).catch((error) => {
    throw new VaultUnavailableError(error);
  });

  await execa.command('vault status', { timeout: 2500 }).catch((error) => {
    if (error.timedOut) {
      throw new VaultTimedOutError(error);
    }
  });

  const secretPath = process.env.VAULT_SECRET_PATH || 'secret/eis/bedrock';

  const output = await execa
    .command(`vault kv get -format json ${secretPath}`)
    .then((value) => {
      return (JSON.parse(value.stdout) as { data: { data: Record<string, string> } }).data.data;
    })
    .catch((error) => {
      throw new VaultAccessError(error);
    });

  const accessKeyId = output.aws_bedrock_access_key_id;
  const secretAccessKey = output.aws_bedrock_secret_access_key;
  const apiEndpoint = output.aws_bedrock_api_endpoint;
  const bedrockModelId = output.aws_bedrock_model_id;
  const awsBedrockRegion = output.aws_bedrock_region;

  const config = {
    accessKeyId,
    secretAccessKey,
    apiEndpoint,
    bedrockModelId,
    awsBedrockRegion,
  };

  return pickBy(config, (val) => !!val) as typeof config;
}

export interface AwsBedrockConfig {
  region: string;
  modelId: string;
  apiEndpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function getDefaults() {
  const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY;
  const region = process.env.AWS_BEDROCK_REGION ?? 'us-west-2';
  const modelId = process.env.AWS_BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const apiEndpoint =
    (process.env.AWS_BEDROCK_API_ENDPOINT = `https://bedrock-runtime.${region}.amazonaws.com`);

  return { accessKeyId, secretAccessKey, region, modelId, apiEndpoint };
}

export async function getBedrockConfig({ log }: { log: ToolingLog }): Promise<AwsBedrockConfig> {
  log.debug(`Checking for Bedrock config`);

  const defaults = getDefaults();

  if (defaults.accessKeyId && defaults.secretAccessKey) {
    return {
      ...defaults,
      accessKeyId: defaults.accessKeyId,
      secretAccessKey: defaults.secretAccessKey,
    };
  }

  log.debug(`No bedrock credentials found in env, checking Vault`);

  return {
    ...defaults,
    ...(await getBedrockCreditsFromVault()),
  };
}
