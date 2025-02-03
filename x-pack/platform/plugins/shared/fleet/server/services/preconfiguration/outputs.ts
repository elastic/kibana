/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'node:crypto';
import utils from 'node:util';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';
import { dump } from 'js-yaml';
import pMap from 'p-map';

const pbkdf2Async = utils.promisify(crypto.pbkdf2);

import type {
  PreconfiguredOutput,
  Output,
  NewOutput,
  OutputSecret,
  KafkaOutput,
  NewLogstashOutput,
  NewRemoteElasticsearchOutput,
} from '../../../common/types';
import { normalizeHostsForAgents } from '../../../common/services';
import type { FleetConfigType } from '../../config';
import { DEFAULT_OUTPUT_ID, DEFAULT_OUTPUT } from '../../constants';
import { outputService } from '../output';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

import { isDifferent } from './utils';

export const MAX_CONCURRENT_OUTPUTS_OPERATIONS = 50;

export function getPreconfiguredOutputFromConfig(config?: FleetConfigType) {
  const { outputs: outputsOrUndefined } = config;

  const outputs: PreconfiguredOutput[] = (outputsOrUndefined || []).concat([
    ...(config?.agents.elasticsearch.hosts
      ? [
          {
            ...DEFAULT_OUTPUT,
            id: DEFAULT_OUTPUT_ID,
            hosts: config?.agents.elasticsearch.hosts,
            ca_sha256: config?.agents.elasticsearch.ca_sha256,
            ca_trusted_fingerprint: config?.agents.elasticsearch.ca_trusted_fingerprint,
            is_preconfigured: true,
          } as PreconfiguredOutput,
        ]
      : []),
  ]);

  return outputs;
}

export async function ensurePreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  await createOrUpdatePreconfiguredOutputs(soClient, esClient, outputs);
  await cleanPreconfiguredOutputs(soClient, esClient, outputs);
}

export async function createOrUpdatePreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  const logger = appContextService.getLogger();

  if (outputs.length === 0) {
    return;
  }

  const existingOutputs = await outputService.bulkGet(
    outputs.map(({ id }) => id),
    { ignoreNotFound: true }
  );

  const updateOrConfigureOutput = async (output: PreconfiguredOutput) => {
    const existingOutput = existingOutputs.find((o) => o.id === output.id);

    const { id, config, ...outputData } = output;

    const configYaml = config ? dump(config) : undefined;

    const data: NewOutput = {
      ...outputData,
      is_preconfigured: true,
      config_yaml: configYaml ?? null,
      // Set value to null to update these fields on update
      ca_sha256: outputData.ca_sha256 ?? null,
      ca_trusted_fingerprint: outputData.ca_trusted_fingerprint ?? null,
      ssl: outputData.ssl ?? null,
    } as NewOutput;

    if (!data.hosts || data.hosts.length === 0) {
      data.hosts = outputService.getDefaultESHosts();
    }

    const isCreate = !existingOutput;

    // field in allow edit are not updated through preconfiguration
    if (!isCreate && output.allow_edit) {
      for (const key of output.allow_edit) {
        // @ts-expect-error
        data[key] = existingOutput[key];
      }
    }

    const isUpdateWithNewData =
      existingOutput && (await isPreconfiguredOutputDifferentFromCurrent(existingOutput, data));

    if (isCreate || isUpdateWithNewData) {
      const secretHashes = await hashSecrets(output);

      if (isCreate) {
        logger.debug(`Creating preconfigured output ${output.id}`);
        await outputService.create(soClient, esClient, data, {
          id,
          fromPreconfiguration: true,
          secretHashes,
        });
      } else if (isUpdateWithNewData) {
        logger.debug(`Updating preconfigured output ${output.id}`);
        await outputService.update(soClient, esClient, id, data, {
          fromPreconfiguration: true,
          secretHashes,
        });
        // Bump revision of all policies using that output
        if (outputData.is_default || outputData.is_default_monitoring) {
          await agentPolicyService.bumpAllAgentPolicies(esClient);
        } else {
          await agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, id);
        }
      }
    }
  };

  await pMap(outputs, (output) => updateOrConfigureOutput(output), {
    concurrency: MAX_CONCURRENT_OUTPUTS_OPERATIONS,
  });
}

// Values recommended by NodeJS documentation
const keyLength = 64;
const saltLength = 16;
const maxIteration = 100000;

export async function hashSecret(secret: string) {
  const salt = crypto.randomBytes(saltLength).toString('hex');
  const derivedKey = await pbkdf2Async(secret, salt, maxIteration, keyLength, 'sha512');

  return `${salt}:${derivedKey.toString('hex')}`;
}
async function verifySecret(hash: string, secret: string) {
  const [salt, key] = hash.split(':');
  const derivedKey = await pbkdf2Async(secret, salt, maxIteration, keyLength, 'sha512');
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

async function hashSecrets(output: PreconfiguredOutput) {
  if (output.type === 'kafka') {
    const kafkaOutput = output as KafkaOutput;
    if (typeof kafkaOutput.secrets?.password === 'string') {
      const password = await hashSecret(kafkaOutput.secrets?.password);
      return {
        password,
      };
    }
    if (typeof kafkaOutput.secrets?.ssl?.key === 'string') {
      const key = await hashSecret(kafkaOutput.secrets?.ssl?.key);
      return {
        ssl: {
          key,
        },
      };
    }
  }
  if (output.type === 'logstash') {
    const logstashOutput = output as NewLogstashOutput;
    if (typeof logstashOutput.secrets?.ssl?.key === 'string') {
      const key = await hashSecret(logstashOutput.secrets?.ssl?.key);
      return {
        ssl: {
          key,
        },
      };
    }
  }
  if (output.type === 'remote_elasticsearch') {
    const remoteESOutput = output as NewRemoteElasticsearchOutput;
    let secrets;
    if (typeof remoteESOutput.secrets?.service_token === 'string') {
      const serviceToken = await hashSecret(remoteESOutput.secrets?.service_token);
      secrets = {
        service_token: serviceToken,
      };
    }
    if (typeof remoteESOutput.secrets?.kibana_api_key === 'string') {
      const kibanaAPIKey = await hashSecret(remoteESOutput.secrets?.kibana_api_key);
      secrets = {
        ...(secrets ? secrets : {}),
        kibana_api_key: kibanaAPIKey,
      };
    }
    return secrets;
  }

  return undefined;
}

export async function cleanPreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  const existingOutputs = await outputService.list(soClient);
  const existingPreconfiguredOutput = existingOutputs.items.filter(
    (o) => o.is_preconfigured === true
  );

  const logger = appContextService.getLogger();

  for (const output of existingPreconfiguredOutput) {
    const hasBeenDelete = !outputs.find(({ id }) => output.id === id);
    if (!hasBeenDelete) {
      continue;
    }

    if (output.is_default) {
      logger.info(`Updating default preconfigured output ${output.id} is no longer preconfigured`);
      await outputService.update(
        soClient,
        esClient,
        output.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else if (output.is_default_monitoring) {
      logger.info(`Updating default preconfigured output ${output.id} is no longer preconfigured`);
      await outputService.update(
        soClient,
        esClient,
        output.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else {
      logger.info(`Deleting preconfigured output ${output.id}`);
      await outputService.delete(soClient, output.id, { fromPreconfiguration: true });
    }
  }
}

const hasHash = (secret?: OutputSecret): secret is { id: string; hash: string } => {
  return !!secret && typeof secret !== 'string' && !!secret.hash;
};

async function isSecretDifferent(
  preconfiguredValue: OutputSecret | undefined,
  existingSecret: OutputSecret | undefined
): Promise<boolean> {
  if (!existingSecret && preconfiguredValue) {
    return true;
  }

  if (!preconfiguredValue && existingSecret) {
    return true;
  }

  if (!preconfiguredValue && !existingSecret) {
    return false;
  }

  if (hasHash(existingSecret) && typeof preconfiguredValue === 'string') {
    // verifying the has tells us if the value has changed
    const hashIsVerified = await verifySecret(existingSecret.hash, preconfiguredValue!);

    return !hashIsVerified;
  } else {
    // if there is no hash then the safest thing to do is assume the value has changed
    return true;
  }
}

async function isPreconfiguredOutputDifferentFromCurrent(
  existingOutput: Output,
  preconfiguredOutput: Partial<Output>
): Promise<boolean> {
  const kafkaFieldsAreDifferent = async (): Promise<boolean> => {
    if (existingOutput.type !== 'kafka' || preconfiguredOutput.type !== 'kafka') {
      return false;
    }

    const passwordHashIsDifferent = await isSecretDifferent(
      preconfiguredOutput.secrets?.password,
      existingOutput.secrets?.password
    );

    const sslKeyHashIsDifferent = await isSecretDifferent(
      preconfiguredOutput.secrets?.ssl?.key,
      existingOutput.secrets?.ssl?.key
    );

    return (
      isDifferent(existingOutput.client_id, preconfiguredOutput.client_id) ||
      isDifferent(existingOutput.version, preconfiguredOutput.version) ||
      isDifferent(existingOutput.key, preconfiguredOutput.key) ||
      isDifferent(existingOutput.compression, preconfiguredOutput.compression) ||
      isDifferent(existingOutput.compression_level, preconfiguredOutput.compression_level) ||
      isDifferent(existingOutput.auth_type, preconfiguredOutput.auth_type) ||
      isDifferent(existingOutput.connection_type, preconfiguredOutput.connection_type) ||
      isDifferent(existingOutput.username, preconfiguredOutput.username) ||
      isDifferent(existingOutput.password, preconfiguredOutput.password) ||
      isDifferent(existingOutput.sasl, preconfiguredOutput.sasl) ||
      isDifferent(existingOutput.partition, preconfiguredOutput.partition) ||
      isDifferent(existingOutput.random, preconfiguredOutput.random) ||
      isDifferent(existingOutput.round_robin, preconfiguredOutput.round_robin) ||
      isDifferent(existingOutput.hash, preconfiguredOutput.hash) ||
      isDifferent(existingOutput.topic, preconfiguredOutput.topic) ||
      isDifferent(existingOutput.headers, preconfiguredOutput.headers) ||
      isDifferent(existingOutput.timeout, preconfiguredOutput.timeout) ||
      isDifferent(existingOutput.broker_timeout, preconfiguredOutput.broker_timeout) ||
      isDifferent(existingOutput.required_acks, preconfiguredOutput.required_acks) ||
      passwordHashIsDifferent ||
      sslKeyHashIsDifferent
    );
  };

  const logstashFieldsAreDifferent = async (): Promise<boolean> => {
    if (existingOutput.type !== 'logstash' || preconfiguredOutput.type !== 'logstash') {
      return false;
    }
    const sslKeyHashIsDifferent = await isSecretDifferent(
      preconfiguredOutput.secrets?.ssl?.key,
      existingOutput.secrets?.ssl?.key
    );

    return sslKeyHashIsDifferent;
  };

  const remoteESFieldsAreDifferent = async (): Promise<boolean> => {
    if (
      existingOutput.type !== 'remote_elasticsearch' ||
      preconfiguredOutput.type !== 'remote_elasticsearch'
    ) {
      return false;
    }
    const serviceTokenIsDifferent =
      (await isSecretDifferent(
        preconfiguredOutput.secrets?.service_token,
        existingOutput.secrets?.service_token
      )) ||
      (await isSecretDifferent(
        preconfiguredOutput.secrets?.kibana_api_key,
        existingOutput.secrets?.kibana_api_key
      )) ||
      isDifferent(existingOutput.kibana_url, preconfiguredOutput.kibana_url) ||
      isDifferent(existingOutput.sync_integrations, preconfiguredOutput.sync_integrations);

    return serviceTokenIsDifferent;
  };

  return (
    !existingOutput.is_preconfigured ||
    isDifferent(existingOutput.is_default, preconfiguredOutput.is_default) ||
    isDifferent(existingOutput.is_default_monitoring, preconfiguredOutput.is_default_monitoring) ||
    isDifferent(existingOutput.name, preconfiguredOutput.name) ||
    isDifferent(existingOutput.type, preconfiguredOutput.type) ||
    (preconfiguredOutput.hosts &&
      !isEqual(
        existingOutput?.type === 'elasticsearch'
          ? existingOutput.hosts?.map(normalizeHostsForAgents)
          : existingOutput.hosts,
        preconfiguredOutput.type === 'elasticsearch'
          ? preconfiguredOutput.hosts.map(normalizeHostsForAgents)
          : preconfiguredOutput.hosts
      )) ||
    isDifferent(preconfiguredOutput.ssl, existingOutput.ssl) ||
    isDifferent(existingOutput.ca_sha256, preconfiguredOutput.ca_sha256) ||
    isDifferent(
      existingOutput.ca_trusted_fingerprint,
      preconfiguredOutput.ca_trusted_fingerprint
    ) ||
    isDifferent(existingOutput.config_yaml, preconfiguredOutput.config_yaml) ||
    isDifferent(existingOutput.proxy_id, preconfiguredOutput.proxy_id) ||
    isDifferent(existingOutput.allow_edit ?? [], preconfiguredOutput.allow_edit ?? []) ||
    (preconfiguredOutput.preset &&
      isDifferent(existingOutput.preset, preconfiguredOutput.preset)) ||
    isDifferent(existingOutput.is_internal, preconfiguredOutput.is_internal) ||
    (await kafkaFieldsAreDifferent()) ||
    (await logstashFieldsAreDifferent()) ||
    (await remoteESFieldsAreDifferent())
  );
}
