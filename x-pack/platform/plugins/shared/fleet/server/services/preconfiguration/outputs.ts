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
import { stringify } from 'yaml';
import pMap from 'p-map';

const pbkdf2Async = utils.promisify(crypto.pbkdf2);

import type {
  PreconfiguredOutput,
  Output,
  NewOutput,
  SOSecret,
  KafkaOutput,
  NewRemoteElasticsearchOutput,
  NewOtlpOutput,
  BeatsOutput,
} from '../../../common/types';
import { normalizeHostsForAgents } from '../../../common/services';
import {
  isBeatsOutput,
  isOtlpOutput,
  isOtelExporterOutput,
} from '../../../common/services/output_helpers';
import type { FleetConfigType } from '../../config';
import {
  DEFAULT_OUTPUT_ID,
  DEFAULT_OUTPUT,
  ECH_AGENTLESS_OUTPUT_ID,
  ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
  SERVERLESS_DEFAULT_OUTPUT_ID,
  SERVERLESS_PRIVATE_OUTPUT_ID,
} from '../../constants';
import { AGENTLESS_MANAGED_BULK_OUTPUT_IDS, outputType } from '../../../common/constants';
import { outputService } from '../output';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { checkOtlpOutputAllowed } from '../outputs/helpers';
import {
  isAgentlessEnabled,
  isManagedBulkEnabled,
  getManagedBulkEndpoint,
} from '../utils/agentless';

import { applyAllowEditOverrides, isDifferent } from './utils';

export const MAX_CONCURRENT_OUTPUTS_OPERATIONS = 50;

const PRIVATELINK_ALLOW_EDIT = ['is_default', 'is_default_monitoring'];
const PRIVATELINK_OUTPUT_IDS = new Set([
  SERVERLESS_DEFAULT_OUTPUT_ID,
  SERVERLESS_PRIVATE_OUTPUT_ID,
]);

export function getPreconfiguredOutputFromConfig(config?: FleetConfigType) {
  const { outputs: outputsOrUndefined } = config;
  const managedBulkEndpoint = getManagedBulkEndpoint();

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
            allow_edit: ['hosts', 'ca_sha256', 'ca_trusted_fingerprint'],
          } as PreconfiguredOutput,
        ]
      : []),
    // Include agentless output in ECH
    ...(isAgentlessEnabled() && !appContextService.getCloud()?.isServerlessEnabled
      ? [
          {
            id: ECH_AGENTLESS_OUTPUT_ID,
            name: 'Internal output for managed integrations',
            type: 'elasticsearch' as const,
            hosts: appContextService.getCloud()?.elasticsearchUrl
              ? [appContextService.getCloud()!.elasticsearchUrl]
              : config?.agents.elasticsearch.hosts || ['http://localhost:9200'],
            ca_sha256: config?.agents.elasticsearch.ca_sha256,
            is_default: false,
            is_default_monitoring: false,
            is_preconfigured: true,
            allow_edit: ['hosts', 'ca_sha256'],
          } as PreconfiguredOutput,
        ]
      : []),
    // Include agentless managed bulk output in ECH.
    // Serverless: the equivalent output is injected by project-controller (see SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID).
    ...(isManagedBulkEnabled() &&
    !appContextService.getCloud()?.isServerlessEnabled &&
    managedBulkEndpoint
      ? [
          {
            id: ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
            name: 'Bulk output for managed integrations',
            type: 'elasticsearch' as const,
            hosts: [managedBulkEndpoint],
            // No ca_sha256 — the managed bulk endpoint uses a public cert trusted by system CAs.
            is_default: false,
            is_default_monitoring: false,
            is_internal: true,
            is_preconfigured: true,
          } as PreconfiguredOutput,
        ]
      : []),
    // Include private ES output when PrivateLink is enabled (serverless only)
    ...(config?.internal?.privateElasticsearchHost
      ? [
          {
            id: SERVERLESS_PRIVATE_OUTPUT_ID,
            name: 'Private Elasticsearch Output',
            type: 'elasticsearch' as const,
            hosts: [config.internal.privateElasticsearchHost],
            is_default: false,
            is_default_monitoring: false,
            is_preconfigured: true,
          } as PreconfiguredOutput,
        ]
      : []),
  ]);

  // Ensure the serverless PrivateLink default and private outputs both allow their
  // is_default / is_default_monitoring fields to be changed at runtime (via the PrivateLink
  // toggle in the Fleet Settings UI). Without this, _validateFieldsAreEditable rejects any
  // PUT that touches those fields on a preconfigured output.
  //
  // We set allow_edit here (rather than requiring it in every config that defines these
  // outputs) so that the behaviour is consistent regardless of how the output was defined
  // (hardcoded above or passed in via config.outputs in the serverless YAML).
  return outputs.map((output) => {
    if (!PRIVATELINK_OUTPUT_IDS.has(output.id)) {
      return output;
    }
    const existingAllowEdit = output.allow_edit ?? [];
    const merged = Array.from(new Set([...existingAllowEdit, ...PRIVATELINK_ALLOW_EDIT]));
    return { ...output, allow_edit: merged };
  });
}

/**
 * Builds a predicate matching outputs that route through the managed `_bulk` endpoint.
 */
export const createManagedBulkOutputMatcher = (config?: FleetConfigType) => {
  const managedBulkUrls = new Set(
    (config ? getPreconfiguredOutputFromConfig(config) : [])
      .filter(({ id }) => AGENTLESS_MANAGED_BULK_OUTPUT_IDS.has(id))
      .flatMap((output) => ('hosts' in output ? output.hosts ?? [] : []))
      .flatMap((host) => {
        try {
          return [normalizeHostsForAgents(host)];
        } catch {
          // cloud.managed_otlp.url is only schema.string(); never throw on the full-policy path
          return [];
        }
      })
  );

  return (output: Output) =>
    output.type === outputType.Elasticsearch &&
    (output.hosts?.some((host) => managedBulkUrls.has(host)) ?? false);
};

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

  // Resolve OTLP eligibility once before the pMap — the version check does a paginated
  // package-policy list and must not run concurrently for each OTLP output.
  // Lazy: skip the check entirely when no OTLP outputs are present.
  const otlpCheck = outputs.some(isOtlpOutput)
    ? await checkOtlpOutputAllowed(esClient, soClient)
    : { result: true as const };

  const updateOrConfigureOutput = async (output: PreconfiguredOutput) => {
    if (isOtlpOutput(output) && !otlpCheck.result) {
      logger.warn(`Skipping preconfigured OTLP output ${output.id}: ${otlpCheck.error}`);
      return;
    }

    const existingOutput = existingOutputs.find((o) => o.id === output.id);

    const { id, config, ...outputData } = output;

    const configYaml = config ? stringify(config) : undefined;

    const data: NewOutput = {
      ...outputData,
      is_preconfigured: true,
      // Beats-specific fields: null these out on update so fields are cleared when not set.
      // isBeatsOutput narrows `output` so beats-only properties are accessible.
      ...(isBeatsOutput(output) && {
        config_yaml: configYaml ?? null,
        ca_sha256: output.ca_sha256 ?? null,
        ca_trusted_fingerprint: output.ca_trusted_fingerprint ?? null,
        ssl: output.ssl ?? null,
      }),
    } as NewOutput;

    if (isBeatsOutput(data) && (!data.hosts || data.hosts.length === 0)) {
      data.hosts = outputService.getDefaultESHosts();
    }

    const isCreate = !existingOutput;

    // field in allow edit are not updated through preconfiguration
    if (!isCreate && output.allow_edit) {
      applyAllowEditOverrides(
        data as unknown as Record<string, unknown>,
        existingOutput as unknown as Record<string, unknown>,
        output.allow_edit
      );
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
        await agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, id, {
          isDefault: data.is_default,
          isDefaultMonitoring: data.is_default_monitoring,
        });
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
  let secrets: Record<string, any> = {};

  if (output.type === 'kafka') {
    const kafkaOutput = output as KafkaOutput;

    if (typeof kafkaOutput.secrets?.password === 'string') {
      const password = await hashSecret(kafkaOutput.secrets?.password);
      secrets = {
        password,
      };
    }
  }

  if (output.type === 'remote_elasticsearch') {
    const remoteESOutput = output as NewRemoteElasticsearchOutput;
    if (typeof remoteESOutput.secrets?.service_token === 'string') {
      const serviceToken = await hashSecret(remoteESOutput.secrets?.service_token);
      secrets = {
        service_token: serviceToken,
      };
    }
  }
  if (isBeatsOutput(output) && typeof output.secrets?.ssl?.key === 'string') {
    const key = await hashSecret(output.secrets.ssl.key);
    secrets = {
      ...(secrets ? secrets : {}),
      ssl: { key },
    };
  }

  if (isOtlpOutput(output)) {
    const tls = output.secrets?.otlp_exporter?.tls;
    const tlsHashes: Record<string, unknown> = {};

    if (typeof tls?.key_pem === 'string') {
      tlsHashes.key_pem = await hashSecret(tls.key_pem);
    }

    const tpmHashes: Record<string, unknown> = {};
    if (typeof tls?.tpm?.owner_auth === 'string') {
      tpmHashes.owner_auth = await hashSecret(tls.tpm.owner_auth);
    }
    if (typeof tls?.tpm?.auth === 'string') {
      tpmHashes.auth = await hashSecret(tls.tpm.auth);
    }
    if (Object.keys(tpmHashes).length) {
      tlsHashes.tpm = tpmHashes;
    }

    if (Object.keys(tlsHashes).length) {
      secrets = { ...secrets, otlp_exporter: { tls: tlsHashes } };
    }
  }

  return secrets;
}

export async function cleanPreconfiguredOutputs(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  outputs: PreconfiguredOutput[]
) {
  const existingPreconfiguredOutputs = await outputService.listPreconfigured();

  const logger = appContextService.getLogger();

  for (const output of existingPreconfiguredOutputs.items) {
    const hasBeenDelete = !outputs.find(({ id }) => output.id === id);
    if (!hasBeenDelete) {
      continue;
    }

    if (output.is_default || output.is_default_monitoring) {
      // When PrivateLink is disabled and the private output was the active default,
      // restore the public serverless default output so agents are not left pointing
      // at an unreachable PrivateLink URL, then delete the private output entirely
      // so it cannot be re-enabled by mistake.
      if (output.id === SERVERLESS_PRIVATE_OUTPUT_ID) {
        logger.info(
          `PrivateLink output ${output.id} was the default; restoring ${SERVERLESS_DEFAULT_OUTPUT_ID} as default`
        );
        await outputService.update(
          soClient,
          esClient,
          SERVERLESS_DEFAULT_OUTPUT_ID,
          {
            is_default: output.is_default ? true : undefined,
            is_default_monitoring: output.is_default_monitoring ? true : undefined,
          },
          { fromPreconfiguration: true }
        );
        logger.info(`Deleting PrivateLink output ${output.id}`);
        await outputService.delete(output.id, { fromPreconfiguration: true });
      } else {
        logger.info(
          `Updating default preconfigured output ${output.id} is no longer preconfigured`
        );
        await outputService.update(
          soClient,
          esClient,
          output.id,
          { is_preconfigured: false },
          {
            fromPreconfiguration: true,
          }
        );
      }
    } else {
      logger.info(`Deleting preconfigured output ${output.id}`);
      await outputService.delete(output.id, { fromPreconfiguration: true });
    }
  }
}

const hasHash = (secret?: SOSecret): secret is { id: string; hash: string } => {
  return !!secret && typeof secret !== 'string' && !!secret.hash;
};

export async function isSecretDifferent(
  preconfiguredValue: SOSecret | undefined,
  existingSecret: SOSecret | undefined
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
  // Type change always requires an update; subsequent branches assume same type.
  if (isDifferent(existingOutput.type, preconfiguredOutput.type)) {
    return true;
  }

  // Fields common to all output types.
  if (
    !existingOutput.is_preconfigured ||
    isDifferent(existingOutput.is_default, preconfiguredOutput.is_default) ||
    isDifferent(existingOutput.is_default_monitoring, preconfiguredOutput.is_default_monitoring) ||
    isDifferent(existingOutput.name, preconfiguredOutput.name) ||
    isDifferent(existingOutput.allow_edit ?? [], preconfiguredOutput.allow_edit ?? []) ||
    isDifferent(existingOutput.is_internal, preconfiguredOutput.is_internal)
  ) {
    return true;
  }

  if (existingOutput.type === outputType.Otlp) {
    const preconfiguredOtlp = preconfiguredOutput as Partial<NewOtlpOutput>;
    const existingTls = existingOutput.secrets?.otlp_exporter?.tls;
    const preconfiguredTls = preconfiguredOtlp.secrets?.otlp_exporter?.tls;
    const [tlsKeyIsDifferent, ownerAuthIsDifferent, tpmAuthIsDifferent] = await Promise.all([
      isSecretDifferent(preconfiguredTls?.key_pem, existingTls?.key_pem),
      isSecretDifferent(preconfiguredTls?.tpm?.owner_auth, existingTls?.tpm?.owner_auth),
      isSecretDifferent(preconfiguredTls?.tpm?.auth, existingTls?.tpm?.auth),
    ]);
    return (
      isDifferent(existingOutput.otlp_exporter, preconfiguredOtlp.otlp_exporter) ||
      tlsKeyIsDifferent ||
      ownerAuthIsDifferent ||
      tpmAuthIsDifferent
    );
  }

  const preconfiguredBeats = preconfiguredOutput as Partial<BeatsOutput>;

  const sslKeyHashIsDifferent = await isSecretDifferent(
    preconfiguredBeats.secrets?.ssl?.key,
    existingOutput.secrets?.ssl?.key
  );

  const kafkaFieldsAreDifferent = async (): Promise<boolean> => {
    if (existingOutput.type !== 'kafka' || preconfiguredOutput.type !== 'kafka') {
      return false;
    }

    const passwordHashIsDifferent = await isSecretDifferent(
      preconfiguredOutput.secrets?.password,
      existingOutput.secrets?.password
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
      isDifferent(
        existingOutput.write_to_logs_streams,
        preconfiguredOutput.write_to_logs_streams
      ) ||
      passwordHashIsDifferent
    );
  };

  const logstashFieldsAreDifferent = async () => {
    if (existingOutput.type !== 'logstash' || preconfiguredOutput.type !== 'logstash') {
      return false;
    }
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
      isDifferent(existingOutput.kibana_url, preconfiguredOutput.kibana_url) ||
      isDifferent(existingOutput.sync_integrations, preconfiguredOutput.sync_integrations) ||
      isDifferent(
        existingOutput.sync_uninstalled_integrations,
        preconfiguredOutput.sync_uninstalled_integrations
      );

    return serviceTokenIsDifferent;
  };

  return (
    !!(
      preconfiguredBeats.hosts &&
      !isEqual(
        existingOutput.type === 'elasticsearch'
          ? existingOutput.hosts?.map(normalizeHostsForAgents)
          : existingOutput.hosts,
        preconfiguredOutput.type === 'elasticsearch'
          ? preconfiguredBeats.hosts.map(normalizeHostsForAgents)
          : preconfiguredBeats.hosts
      )
    ) ||
    isDifferent(preconfiguredBeats.ssl, existingOutput.ssl) ||
    isDifferent(existingOutput.ca_sha256, preconfiguredBeats.ca_sha256) ||
    isDifferent(existingOutput.ca_trusted_fingerprint, preconfiguredBeats.ca_trusted_fingerprint) ||
    isDifferent(existingOutput.config_yaml, preconfiguredBeats.config_yaml) ||
    (isOtelExporterOutput(existingOutput) &&
      isOtelExporterOutput(preconfiguredOutput) &&
      (isDifferent(
        existingOutput.otel_exporter_config_yaml,
        preconfiguredOutput.otel_exporter_config_yaml
      ) ||
        isDifferent(
          existingOutput.otel_disable_beatsauth,
          preconfiguredOutput.otel_disable_beatsauth
        ))) ||
    // Kafka does not support proxies; proxy_id is always cleared on save (#267281)
    (existingOutput.type !== 'kafka' &&
      isDifferent(existingOutput.proxy_id, preconfiguredBeats.proxy_id)) ||
    !!(
      preconfiguredBeats.preset && isDifferent(existingOutput.preset, preconfiguredBeats.preset)
    ) ||
    sslKeyHashIsDifferent ||
    (await kafkaFieldsAreDifferent()) ||
    (await logstashFieldsAreDifferent()) ||
    (await remoteESFieldsAreDifferent())
  );
}
