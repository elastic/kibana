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

class VaultUnavailableError extends Error {
  constructor(cause: Error) {
    super(`Vault is not available. See https://docs.elastic.dev/vault.`, { cause });
  }
}

class VaultTimedOutError extends Error {
  constructor(cause: Error) {
    super(
      `Vault timed out. Make sure you are connected to the VPN. See https://docs.elastic.dev/vault.`,
      { cause }
    );
  }
}

class VaultAccessError extends Error {
  constructor(cause: Error) {
    super(`Could not read from Vault`, { cause });
  }
}

class InvalidCredentialsError extends Error {}

async function getBedrockCreditsFromVault() {
  await execa.command(`which vault`).catch((error) => {
    throw new VaultUnavailableError(error);
  });

  await execa.command('vault status', { timeout: 2500 }).catch((error) => {
    if (error.timedOut) {
      throw new VaultTimedOutError(error);
    }
    throw new VaultAccessError(error);
  });

  const secretPath = process.env.VAULT_SECRET_PATH || 'kibana-eis-bedrock-config';
  const vaultAddress = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';

  const output = await execa
    .command(`vault kv get -format json ${secretPath}`, {
      // extends env
      env: {
        VAULT_ADDR: vaultAddress,
      },
    })
    .then((value) => {
      return (JSON.parse(value.stdout) as { data: { data: Record<string, string> } }).data.data;
    })
    .catch((error) => {
      throw new VaultAccessError(error);
    });

  const next = {
    accessKeyId: output.aws_bedrock_access_key_id,
    secretAccessKey: output.aws_bedrock_secret_access_key,
    apiEndpoint: output.aws_bedrock_api_endpoint,
    modelId: output.aws_bedrock_model_id,
    region: output.aws_bedrock_region,
  };

  return pickBy(next, (value, key) => !!value) as typeof next;
}

export interface AwsBedrockConfig {
  region: string;
  modelId: string;
  apiEndpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function getDefaults(existingEnv?: Record<string, string>) {
  const allEnv = {
    ...existingEnv,
    ...process.env,
  };

  const accessKeyId = allEnv.AWS_BEDROCK_ACCESS_KEY_ID;
  const secretAccessKey = allEnv.AWS_BEDROCK_SECRET_ACCESS_KEY;
  const region = allEnv.AWS_BEDROCK_REGION ?? 'us-west-2';
  const modelId = allEnv.AWS_BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const apiEndpoint =
    (allEnv.AWS_BEDROCK_API_ENDPOINT = `https://bedrock-runtime.${region}.amazonaws.com`);

  return { accessKeyId, secretAccessKey, region, modelId, apiEndpoint };
}

async function getEnvFromConfig(dockerComposeFilePath: string) {
  const eisGatewayContainerName = await execa
    .command(`docker compose -f ${dockerComposeFilePath} ps --all -q eis-gateway`)
    .then(({ stdout }) => stdout)
    .catch((error) => {
      return undefined;
    });

  if (!eisGatewayContainerName) {
    return undefined;
  }

  const config = await execa
    .command(`docker inspect ${eisGatewayContainerName}`)
    .then(({ stdout }) => {
      return JSON.parse(stdout)[0] as { Config: { Env: string[] } };
    })
    .catch(() => {
      return undefined;
    });

  const envVariables = config?.Config.Env.map((env) => {
    const [key, value] = env.split('=');
    // account for `AWS_BEDROCK_AWS_ACCESS_KEY_ID` and `AWS_BEDROCK_AWS_SECRET_ACCESS_KEY`
    return [key.replace('_AWS', ''), value] as const;
  });

  if (envVariables?.length) {
    return Object.fromEntries(envVariables) as Record<string, string>;
  }

  return undefined;
}

export async function getBedrockConfig({
  log,
  dockerComposeFilePath,
}: {
  log: ToolingLog;
  dockerComposeFilePath: string;
}): Promise<AwsBedrockConfig> {
  log.debug(`Checking for Bedrock config`);

  const existingEnv = await getEnvFromConfig(dockerComposeFilePath);

  const defaults = {
    ...getDefaults(existingEnv),
  };

  if (defaults.accessKeyId && defaults.secretAccessKey) {
    return {
      ...defaults,
      accessKeyId: defaults.accessKeyId,
      secretAccessKey: defaults.secretAccessKey,
    };
  }

  log.debug(`No bedrock credentials found in env, checking Vault`);

  const credentials = {
    ...defaults,
    ...(await getBedrockCreditsFromVault()),
  };

  const missing = Object.keys(pickBy(credentials, (value) => !value));

  if (missing.includes('accessKeyId') || missing.includes('secretAccessKey')) {
    throw new InvalidCredentialsError(`Missing credentials ${missing.join(', ')}`);
  }

  return credentials;
}
