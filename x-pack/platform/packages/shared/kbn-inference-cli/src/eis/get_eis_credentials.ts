/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { pickBy, mapKeys } from 'lodash';

class VaultUnavailableError extends Error {
  constructor(cause: Error) {
    super(`Vault is not available. See https://docs.elastic.dev/vault.`, { cause });
  }
}

class VaultTimedOutError extends Error {
  constructor(cause: Error) {
    super(
      `Vault timed out. Make sure you are connected to the VPN if this is needed for the specified Vault cluster. See https://docs.elastic.dev/vault.`,
      { cause }
    );
  }
}

class VaultAccessError extends Error {
  constructor(cause: Error) {
    super(`Could not read from Vault`, { cause });
  }
}

async function getEisCreditsFromVault() {
  await execa.command(`which vault`).catch((error) => {
    throw new VaultUnavailableError(error);
  });

  await execa.command('vault status', { timeout: 2500 }).catch((error) => {
    if (error.timedOut) {
      throw new VaultTimedOutError(error);
    }
    throw new VaultAccessError(error);
  });

  const secretPath =
    process.env.VAULT_SECRET_PATH || 'secret/kibana-issues/dev/inference/kibana-eis-bedrock-config';
  const vaultAddress = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';

  const output = await execa
    .command(`vault kv get -format json ${secretPath}`, {
      // extends env
      env: {
        VAULT_ADDR: vaultAddress,
      },
    })
    .then((value) => {
      const creds = (JSON.parse(value.stdout) as { data: EisCredentials }).data;

      return mapKeys(creds, (val, key) => {
        // temp until secret gets updated
        return key
          .replace('_access_key_id', '_aws_access_key_id')
          .replace('_secret_access_key', '_aws_secret_access_key')
          .toUpperCase();
      });
    })
    .catch((error) => {
      throw new VaultAccessError(error);
    });

  return output as EisCredentials;
}

export interface EisCredentials {
  [x: string]: string;
}

function getCredentialCandidatesFromEnv(
  env?: Array<[string, string | undefined]>
): Record<string, string> | undefined {
  if (!env) {
    return undefined;
  }

  const candidates = env.filter(
    (pair): pair is [string, string] => !!pair[1] && pair[0].toLowerCase().startsWith('aws_')
  );
  return candidates.length ? Object.fromEntries(candidates) : undefined;
}

async function getEnvFromConfig({
  dockerComposeFilePath,
  log,
}: {
  dockerComposeFilePath: string;
  log: ToolingLog;
}) {
  const eisGatewayContainerName = await execa
    .command(`docker compose -f ${dockerComposeFilePath} ps --all -q eis-gateway`)
    .then(({ stdout }) => stdout)
    .catch((error) => {
      return undefined;
    });

  if (!eisGatewayContainerName) {
    log.debug(`No EIS container found to get env variables from`);
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

  const envVariables = getCredentialCandidatesFromEnv(
    config?.Config.Env.map((line) => {
      const [key, ...value] = line.split('=');
      return [key, value.join('=')];
    })
  );

  return envVariables;
}

export async function getEisCredentials({
  log,
  dockerComposeFilePath,
}: {
  log: ToolingLog;
  dockerComposeFilePath: string;
}): Promise<EisCredentials> {
  log.debug(`Fetching EIS credentials`);

  const envVariables = getCredentialCandidatesFromEnv(Object.entries(process.env));

  const existingContainerEnv = await getEnvFromConfig({ dockerComposeFilePath, log });

  const credentials = await getEisCreditsFromVault()
    .catch((error) => {
      if (envVariables || existingContainerEnv) {
        log.debug(
          `Gracefully handling Vault error, as environment variables are found: ${error.message}`
        );
        return {};
      }
      throw error;
    })
    .then((creds) => {
      return {
        ...existingContainerEnv,
        ...pickBy(creds, (val) => !!val),
        ...envVariables,
      };
    });

  log.debug(`Using credentials: ${JSON.stringify(credentials)}`);

  return credentials;
}
