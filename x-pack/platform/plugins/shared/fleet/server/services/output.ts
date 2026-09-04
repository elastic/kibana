/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v5 as uuidv5 } from 'uuid';
import { escapeQuotes } from '@kbn/es-query';
import { omit } from 'lodash';
import { parse } from 'yaml';
import deepEqual from 'fast-deep-equal';
import { indexBy } from 'lodash/fp';

import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsUtils, SavedObjectsErrorHelpers } from '@kbn/core/server';

import _ from 'lodash';

import pMap from 'p-map';

import {
  getDefaultPresetForEsOutput,
  outputTypeSupportPresets,
  outputYmlIncludesReservedPerformanceKey,
  isBeatsOutput,
  isOtlpOutput,
} from '../../common/services/output_helpers';
import { packagePolicyHasOnlyOtelInputs } from '../../common/services/otelcol_helpers';

import type {
  NewOutput,
  Output,
  OutputSOAttributes,
  AgentPolicy,
  OutputSoKafkaAttributes,
  OutputSoRemoteElasticsearchAttributes,
  OutputSoOtlpAttributes,
  OutputSoBaseAttributes,
  SecretReference,
  BeatsSoBaseAttributes,
  BeatsOutputSOAttributes,
} from '../types';
import type {
  NewBeatsOutput,
  OtlpGrpcExporterConfig,
  OtlpHttpExporterConfig,
  UpdateOutput,
  UpdateTypedOutput,
} from '../../common/types';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  DEFAULT_OUTPUT,
  DEFAULT_OUTPUT_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  OUTPUT_HEALTH_DATA_STREAM,
  MAX_CONCURRENT_BACKFILL_OUTPUTS_PRESETS,
} from '../constants';
import {
  SO_SEARCH_LIMIT,
  outputType,
  kafkaSaslMechanism,
  kafkaPartitionType,
  kafkaCompressionType,
  kafkaAuthType,
  kafkaAcknowledgeReliabilityLevel,
  otlpProtocol,
  OTLP_GRPC_ONLY_COMPRESSION_TYPES,
  RESERVED_CONFIG_YML_KEYS,
  FLEET_APM_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_SERVER_PACKAGE,
} from '../../common/constants';
import type { ValueOf } from '../../common/types';
import { normalizeHostsForAgents, validateFleetSavedObjectId } from '../../common/services';
import {
  FleetEncryptedSavedObjectEncryptionKeyRequired,
  OutputInvalidError,
  OutputUnauthorizedError,
} from '../errors';

import { OUTPUT_ENCRYPTED_FIELDS } from '../saved_objects';

import type { OutputType } from '../types';

import { agentPolicyService } from './agent_policy';
import { packagePolicyService } from './package_policy';
import { appContextService } from './app_context';
import { escapeSearchQueryPhrase } from './saved_object';
import { auditLoggingService } from './audit_logging';
import {
  deleteOutputSecrets,
  deleteSecrets,
  extractAndUpdateOutputSecrets,
  extractAndWriteOutputSecrets,
  isOutputSecretStorageEnabled,
} from './secrets';
import { findAgentlessPolicies, checkOtlpOutputAllowed } from './outputs/helpers';
import { patchUpdateDataWithRequireEncryptedAADFields } from './outputs/so_helpers';
import {
  validateOutputSslPaths,
  ensureNoDuplicateSecrets,
  validateOutputServerless,
} from './outputs/validators';

import {
  canEnableSyncIntegrations,
  createOrUpdateFleetSyncedIntegrationsIndex,
} from './setup/fleet_synced_integrations';

type Nullable<T> = { [P in keyof T]: T[P] | null };

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

// differentiate
function isUUID(val: string) {
  return (
    typeof val === 'string' &&
    val.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/)
  );
}

export function outputIdToUuid(id: string) {
  if (isUUID(id)) {
    return id;
  }

  // UUID v5 need a namespace (uuid.DNS), changing this params will result in loosing the ability to generate predicable uuid
  return uuidv5(id, uuidv5.DNS);
}

const isBeatsSOOutput = (attrs: OutputSOAttributes): attrs is BeatsOutputSOAttributes =>
  isBeatsOutput(attrs);

const isOtlpSOOutput = (attrs: OutputSOAttributes): attrs is OutputSoOtlpAttributes =>
  isOtlpOutput(attrs);

export function outputSavedObjectToOutput(so: SavedObject<OutputSOAttributes>): Output {
  const logger = appContextService.getLogger();

  if (isBeatsSOOutput(so.attributes)) {
    const { output_id: outputId, ssl, proxy_id: proxyId, ...attributes } = so.attributes;
    let parsedSsl;
    try {
      parsedSsl = typeof ssl === 'string' ? JSON.parse(ssl) : undefined;
    } catch (e) {
      logger.warn(`Unable to parse ssl for output ${so.id}: ${e.message}`);
    }
    return {
      id: outputId ?? so.id,
      ...attributes,
      ...(parsedSsl ? { ssl: parsedSsl } : {}),
      ...(proxyId ? { proxy_id: proxyId } : {}),
    };
  }

  if (isOtlpSOOutput(so.attributes)) {
    const { output_id: outputId, ...attributes } = so.attributes;
    return { id: outputId ?? so.id, ...attributes };
  }

  const { output_id: outputId, ...attributes } =
    so.attributes as unknown as OutputSoBaseAttributes & Record<string, unknown>;
  return { id: outputId ?? so.id, ...attributes } as unknown as Output;
}

async function getAgentPoliciesPerOutput(
  outputId?: string,
  isDefault?: boolean,
  options: { fields?: string[] } = {}
) {
  const { fields } = options;
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();
  let agentPoliciesKuery: string;
  let packagePoliciesKuery: string | undefined;
  if (outputId) {
    packagePoliciesKuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.output_id:"${escapeQuotes(
      outputId
    )}"`;
    if (isDefault) {
      agentPoliciesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${escapeQuotes(
        outputId
      )}" or not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*`;
    } else {
      agentPoliciesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${escapeQuotes(
        outputId
      )}"`;
    }
  } else {
    if (isDefault) {
      agentPoliciesKuery = `not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*`;
    } else {
      return;
    }
  }

  // Get agent policies directly using output
  const directAgentPolicies = await agentPolicyService.list(internalSoClientWithoutSpaceExtension, {
    kuery: agentPoliciesKuery,
    perPage: SO_SEARCH_LIMIT,
    spaceId: '*',
    ...(fields ? { fields } : {}),
  });
  const directAgentPolicyIds = directAgentPolicies?.items.map((policy) => policy.id);

  // Get package policies using output and derive agent policies from that which
  // are not already identfied above. The IDs cannot be used as part of the kuery
  // above since the underlying saved object client .find() only filters on attributes
  const packagePolicySOs = packagePoliciesKuery
    ? await packagePolicyService.list(internalSoClientWithoutSpaceExtension, {
        kuery: packagePoliciesKuery,
        perPage: SO_SEARCH_LIMIT,
        spaceId: '*',
      })
    : undefined;
  const agentPolicyIdsFromPackagePolicies = [
    ...new Set(
      packagePolicySOs?.items.reduce((acc: string[], packagePolicy) => {
        return [
          ...acc,
          ...packagePolicy.policy_ids.filter((id) => !directAgentPolicyIds?.includes(id)),
        ];
      }, [])
    ),
  ];
  const agentPoliciesFromPackagePolicies = await agentPolicyService.getByIds(
    internalSoClientWithoutSpaceExtension,
    agentPolicyIdsFromPackagePolicies.map((id) => ({ id, spaceId: '*' })),
    { ...(fields ? { fields } : {}) }
  );

  const agentPoliciesIndexedById = indexBy(
    (policy) => policy.id,
    [...directAgentPolicies.items, ...agentPoliciesFromPackagePolicies]
  );

  // Bulk-fetch restricted packages (fleet server, synthetics, APM) so callers like
  // validateLogstashOutputNotUsedInAPMPolicy can detect integration conflicts.
  if (Object.keys(agentPoliciesIndexedById).length) {
    const { items: packagePolicies } = await packagePolicyService.list(
      internalSoClientWithoutSpaceExtension,
      {
        fields: ['policy_ids', 'package.name'],
        perPage: SO_SEARCH_LIMIT,
        kuery: [FLEET_APM_PACKAGE, FLEET_SYNTHETICS_PACKAGE, FLEET_SERVER_PACKAGE]
          .map((packageName) => `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`)
          .join(' or '),
      }
    );
    for (const packagePolicy of packagePolicies) {
      for (const policyId of packagePolicy.policy_ids) {
        if (agentPoliciesIndexedById[policyId]) {
          if (!agentPoliciesIndexedById[policyId].package_policies) {
            agentPoliciesIndexedById[policyId].package_policies = [];
          }
          agentPoliciesIndexedById[policyId].package_policies?.push(packagePolicy);
        }
      }
    }
  }

  return Object.values(agentPoliciesIndexedById);
}

async function validateLogstashOutputNotUsedInAPMPolicy(outputId?: string, isDefault?: boolean) {
  const agentPolicies = await getAgentPoliciesPerOutput(outputId, isDefault);

  // Validate no policy with APM use that policy
  if (agentPolicies) {
    for (const agentPolicy of agentPolicies) {
      if (agentPolicyService.hasAPMIntegration(agentPolicy)) {
        throw new OutputInvalidError('Logstash output cannot be used with APM integration.');
      }
    }
  }
}

const OTLP_SCAN_POLICY_ID_CHUNK_SIZE = 100;

async function validateOtlpOutputOnlyUsedInOtelPolicies(
  outputId: string,
  mergedIsDefault: boolean
) {
  const agentPolicies = await getAgentPoliciesPerOutput(outputId, mergedIsDefault, {
    fields: ['name'],
  });
  if (!agentPolicies?.length) return;

  const policyNamesById = new Map(agentPolicies.map((p) => [p.id, p.name]));
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  for (const ids of _.chunk([...policyNamesById.keys()], OTLP_SCAN_POLICY_ID_CHUNK_SIZE)) {
    const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids:(${ids
      .map((id) => `"${escapeQuotes(id)}"`)
      .join(' or ')})`;

    for await (const packagePolicies of await packagePolicyService.fetchAllItems(soClient, {
      kuery,
      fields: ['policy_ids', 'inputs.type', 'inputs.enabled'],
      spaceIds: ['*'],
    })) {
      for (const packagePolicy of packagePolicies) {
        if (packagePolicyHasOnlyOtelInputs(packagePolicy.inputs)) continue;
        const conflictingId = packagePolicy.policy_ids.find((id) => policyNamesById.has(id));
        throw new OutputInvalidError(
          `OTLP output cannot be used with agent policy "${policyNamesById.get(conflictingId!)}" ` +
            `because it contains non-OTel inputs.`
        );
      }
    }
  }
}

async function findPoliciesWithFleetServerOrSynthetics(outputId?: string, isDefault?: boolean) {
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();

  let agentPolicies: AgentPolicy[] | undefined;
  if (outputId) {
    agentPolicies = await getAgentPoliciesPerOutput(outputId, isDefault);
  } else {
    const { items: packagePolicies } = await packagePolicyService.list(
      internalSoClientWithoutSpaceExtension,
      {
        fields: ['policy_ids', 'package.name'],
        spaceId: '*',
        kuery: [FLEET_APM_PACKAGE, FLEET_SYNTHETICS_PACKAGE, FLEET_SERVER_PACKAGE]
          .map((packageName) => `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`)
          .join(' or '),
      }
    );
    const agentPolicyIds = _.uniq(packagePolicies.flatMap((p) => p.policy_ids));
    if (agentPolicyIds.length) {
      agentPolicies = await agentPolicyService.getByIds(
        internalSoClientWithoutSpaceExtension,
        agentPolicyIds.map((id) => ({ id, spaceId: '*' }))
      );
      for (const packagePolicy of packagePolicies) {
        for (const policyId of packagePolicy.policy_ids) {
          const agentPolicy = agentPolicies.find((p) => p.id === policyId);
          if (agentPolicy) {
            if (!agentPolicy.package_policies) {
              agentPolicy.package_policies = [];
            }
            agentPolicy.package_policies?.push(packagePolicy);
          }
        }
      }
    }
  }

  const policiesWithFleetServer =
    agentPolicies?.filter((policy) => agentPolicyService.hasFleetServerIntegration(policy)) || [];
  const policiesWithSynthetics =
    agentPolicies?.filter((policy) => agentPolicyService.hasSyntheticsIntegration(policy)) || [];
  return { policiesWithFleetServer, policiesWithSynthetics };
}

function validateOutputNotUsedInPolicy(
  agentPolicies: AgentPolicy[],
  dataOutputType: ValueOf<OutputType>,
  integrationName: string
) {
  // Validate no policy with this integration uses that output
  for (const agentPolicy of agentPolicies) {
    throw new OutputInvalidError(
      `${_.capitalize(
        dataOutputType
      )} output cannot be used with ${integrationName} integration in ${
        agentPolicy.name
      }. Please create a new Elasticsearch output.`
    );
  }
}

async function validateTypeChanges(
  esClient: ElasticsearchClient,
  id: string,
  data: Nullable<Partial<OutputSOAttributes>>,
  originalOutput: Output,
  defaultDataOutputId: string | null,
  fromPreconfiguration: boolean
) {
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const mergedIsDefault = data.is_default ?? originalOutput.is_default;
  const mergedType = data.type ?? originalOutput.type;
  const { policiesWithFleetServer, policiesWithSynthetics } =
    await findPoliciesWithFleetServerOrSynthetics(id, mergedIsDefault);
  const agentlessPolicies = await findAgentlessPolicies(id);

  if (mergedType === outputType.Logstash) {
    await validateLogstashOutputNotUsedInAPMPolicy(id, mergedIsDefault);
  }

  if (mergedType === outputType.Otlp) {
    await validateOtlpOutputOnlyUsedInOtelPolicies(id, mergedIsDefault);
  }

  // prevent changing an ES output to a non-local ES output if it's used by an invalid policy
  if (
    originalOutput.type === outputType.Elasticsearch &&
    mergedType !== outputType.Elasticsearch &&
    data.type
  ) {
    // Validate no policy with fleet server, synthetics, or agentless policies use that output
    validateOutputNotUsedInPolicy(policiesWithFleetServer, data.type, 'Fleet Server');
    validateOutputNotUsedInPolicy(policiesWithSynthetics, data.type, 'Synthetics');
    validateOutputNotUsedInPolicy(agentlessPolicies, data.type, 'agentless');
  }

  await updateAgentPoliciesDataOutputId(
    internalSoClientWithoutSpaceExtension,
    esClient,
    data,
    mergedIsDefault,
    defaultDataOutputId,
    _.uniq([...policiesWithFleetServer, ...policiesWithSynthetics, ...agentlessPolicies]),
    fromPreconfiguration
  );
}

async function updateAgentPoliciesDataOutputId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  data: Nullable<Partial<OutputSOAttributes>>,
  isDefault: boolean,
  defaultDataOutputId: string | null,
  agentPolicies: AgentPolicy[],
  fromPreconfiguration: boolean
) {
  // if a non-local ES output is about to be updated to become default
  // and fleet server, synthetics, or agentless policies don't have
  // data_output_id set, update them to use the current default output ID
  if (data?.type !== outputType.Elasticsearch && isDefault) {
    for (const policy of agentPolicies) {
      if (!policy.data_output_id) {
        await agentPolicyService.update(
          soClient,
          esClient,
          policy.id,
          {
            data_output_id: defaultDataOutputId,
          },
          { force: fromPreconfiguration }
        );
      }
    }
  }
}

async function remoteSyncIntegrationsCheck(
  esClient: ElasticsearchClient,
  output: Partial<NewOutput>
) {
  const syncIntegrationsEnabled =
    output.type === outputType.RemoteElasticsearch && output.sync_integrations === true;
  if (syncIntegrationsEnabled && !canEnableSyncIntegrations()) {
    throw new OutputUnauthorizedError(
      'Remote sync integrations require at least an Enterprise license.'
    );
  } else if (syncIntegrationsEnabled) {
    await createOrUpdateFleetSyncedIntegrationsIndex(esClient);
  }
}

class OutputService {
  private get soClient() {
    return appContextService.getInternalUserSOClient();
  }

  private get encryptedSoClient() {
    return appContextService.getEncryptedSavedObjects();
  }

  private async assertOtlpOutputAllowed(
    output: { type: ValueOf<OutputType> },
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ): Promise<void> {
    if (!isOtlpOutput(output)) return;
    const { result, error } = await checkOtlpOutputAllowed(esClient, soClient);
    if (!result) {
      throw new OutputInvalidError(error!);
    }
  }

  private async _getDefaultDataOutputsSO() {
    const outputs = await this.soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });

    for (const output of outputs.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    return outputs;
  }

  private async _getDefaultMonitoringOutputsSO() {
    const outputs = await this.soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default_monitoring'],
      search: 'true',
    });

    for (const output of outputs.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    return outputs;
  }

  private async _updateDefaultOutput(
    defaultDataOutputId: string,
    updateData: { is_default: boolean } | { is_default_monitoring: boolean },
    fromPreconfiguration: boolean
  ) {
    const originalOutput = await this.get(defaultDataOutputId);
    this._validateFieldsAreEditable(
      originalOutput,
      updateData,
      defaultDataOutputId,
      fromPreconfiguration
    );

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: outputIdToUuid(defaultDataOutputId),
      name: originalOutput.name,
      savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
    });

    return await this.soClient.update<Nullable<OutputSOAttributes>>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(defaultDataOutputId),
      updateData
    );
  }

  private _validateFieldsAreEditable(
    originalOutput: Output,
    data: Partial<Output>,
    id: string,
    fromPreconfiguration: boolean
  ) {
    if (originalOutput.is_preconfigured) {
      if (!fromPreconfiguration) {
        const allowEditFields = originalOutput.allow_edit ?? [];

        const allKeys = Array.from(new Set([...Object.keys(data)])) as Array<keyof Output>;
        for (const key of allKeys) {
          if (
            (!!originalOutput[key] || !!data[key]) &&
            !allowEditFields.includes(key) &&
            !deepEqual(originalOutput[key], data[key])
          ) {
            // Allow ssl to differ if set to default empty values (beats outputs only)
            if (isBeatsOutput(originalOutput)) {
              const beatsKey = key as keyof typeof originalOutput;
              if (
                beatsKey === 'ssl' &&
                originalOutput.ssl === undefined &&
                deepEqual((data as Partial<NewBeatsOutput>).ssl, {
                  certificate: '',
                  certificate_authorities: [],
                })
              ) {
                continue;
              }
            }
            throw new OutputUnauthorizedError(
              `Preconfigured output ${id} ${key} cannot be updated outside of kibana config file.`
            );
          }
        }
      }
    }
  }

  public async ensureDefaultOutput(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ) {
    // Query the default outputs directly to avoid decrypting every output in the cluster.
    const [defaultDataOutputs, defaultMonitoringOutputs] = await Promise.all([
      this._getDefaultDataOutputsSO(),
      this._getDefaultMonitoringOutputsSO(),
    ]);

    const defaultOutput = defaultDataOutputs.saved_objects[0];
    const hasDefaultMonitoringOutput = defaultMonitoringOutputs.saved_objects.length > 0;

    if (!defaultOutput) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: this.getDefaultESHosts(),
        ca_sha256: appContextService.getConfig()!.agents.elasticsearch.ca_sha256,
        is_default_monitoring: !hasDefaultMonitoringOutput,
      } as NewOutput;

      return await this.create(soClient, esClient, newDefaultOutput, {
        id: DEFAULT_OUTPUT_ID,
        overwrite: true,
      });
    }

    return outputSavedObjectToOutput(defaultOutput);
  }

  public getDefaultESHosts(): string[] {
    const cloud = appContextService.getCloud();
    const cloudUrl = cloud?.elasticsearchUrl;
    const cloudHosts = cloudUrl ? [cloudUrl] : undefined;
    const flagHosts =
      appContextService.getConfig()!.agents?.elasticsearch?.hosts &&
      appContextService.getConfig()!.agents.elasticsearch.hosts?.length
        ? appContextService.getConfig()!.agents.elasticsearch.hosts
        : undefined;

    return cloudHosts || flagHosts || DEFAULT_ES_HOSTS;
  }

  public async getDefaultDataOutputId() {
    const outputs = await this._getDefaultDataOutputsSO();

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async getDefaultMonitoringOutputId() {
    const outputs = await this._getDefaultMonitoringOutputsSO();

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    output: NewOutput,
    options?: {
      id?: string;
      fromPreconfiguration?: boolean;
      overwrite?: boolean;
      secretHashes?: Record<string, any>;
    }
  ): Promise<Output> {
    const logger = appContextService.getLogger();
    logger.debug(`Creating new output`);

    validateFleetSavedObjectId(options?.id);

    await this.assertOtlpOutputAllowed(output, esClient, soClient);

    await validateOutputServerless(this, output);
    const isPreconfigured =
      (options?.fromPreconfiguration ||
        ('is_preconfigured' in output && output.is_preconfigured)) ??
      false;
    this._runOutputValidators(output, isPreconfigured);

    const data: OutputSOAttributes = {
      ...omit(output, ['ssl', 'secrets']),
      ...(options?.id ? { output_id: options.id } : {}),
    } as OutputSOAttributes;

    if (outputTypeSupportPresets(output)) {
      if (
        output.preset === 'balanced' &&
        outputYmlIncludesReservedPerformanceKey(output.config_yaml ?? '', parse)
      ) {
        throw new OutputInvalidError(
          `preset cannot be balanced when config_yaml contains one of ${RESERVED_CONFIG_YML_KEYS.join(
            ', '
          )}`
        );
      }
    }

    const defaultDataOutputId = await this.getDefaultDataOutputId();

    if (output.type === outputType.Logstash) {
      await validateLogstashOutputNotUsedInAPMPolicy(undefined, data.is_default);
    }

    if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
      throw new FleetEncryptedSavedObjectEncryptionKeyRequired(
        `${output.type} output needs encrypted saved object api key to be set`
      );
    }

    const { policiesWithFleetServer, policiesWithSynthetics } =
      await findPoliciesWithFleetServerOrSynthetics();
    const agentlessPolicies = await findAgentlessPolicies();
    await updateAgentPoliciesDataOutputId(
      soClient,
      esClient,
      data,
      data.is_default,
      defaultDataOutputId,
      _.uniq([...policiesWithFleetServer, ...policiesWithSynthetics, ...agentlessPolicies]),
      options?.fromPreconfiguration ?? false
    );

    // ensure only default output exists
    if (data.is_default) {
      if (defaultDataOutputId && defaultDataOutputId !== options?.id) {
        await this._updateDefaultOutput(
          defaultDataOutputId,
          { is_default: false },
          options?.fromPreconfiguration ?? false
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId();
      if (defaultMonitoringOutputId && defaultMonitoringOutputId !== options?.id) {
        await this._updateDefaultOutput(
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          options?.fromPreconfiguration ?? false
        );
      }
    }

    if (
      (data.type === outputType.Elasticsearch || data.type === outputType.RemoteElasticsearch) &&
      data.hosts
    ) {
      data.hosts = data.hosts.map(normalizeHostsForAgents);
    }

    if (isBeatsOutput(output) && isBeatsSOOutput(data)) {
      if (output.ssl) {
        data.ssl = JSON.stringify(output.ssl);
      }

      // Remove the shipper data if the shipper is not enabled from the yaml config
      if (!output.config_yaml && output.shipper) {
        data.shipper = null;
      }

      if (!output.preset && outputTypeSupportPresets(output)) {
        data.preset = getDefaultPresetForEsOutput(output.config_yaml ?? '', parse);
      }

      if (output.config_yaml) {
        const configJs = parse(output.config_yaml);
        const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

        if (isShipperDisabled && output.shipper) {
          data.shipper = null;
        }
      }
    }

    if (output.type === outputType.Kafka && data.type === outputType.Kafka) {
      if (!output.version) {
        data.version = '1.0.0';
      }
      if (!output.compression) {
        data.compression = kafkaCompressionType.Gzip;
      }
      if (
        !output.compression ||
        (output.compression === kafkaCompressionType.Gzip && !output.compression_level)
      ) {
        data.compression_level = 4;
      }
      if (!output.client_id) {
        data.client_id = 'Elastic';
      }
      if (output.username && output.password && !output.sasl?.mechanism) {
        data.sasl = {
          mechanism: kafkaSaslMechanism.Plain,
        };
      }
      if (!output.partition) {
        data.partition = kafkaPartitionType.Hash;
      }
      if (output.partition === kafkaPartitionType.Random && !output.random?.group_events) {
        data.random = {
          group_events: 1,
        };
      }
      if (output.partition === kafkaPartitionType.RoundRobin && !output.round_robin?.group_events) {
        data.round_robin = {
          group_events: 1,
        };
      }
      if (!output.timeout) {
        data.timeout = 30;
      }
      if (!output.broker_timeout) {
        data.broker_timeout = 10;
      }
      if (output.required_acks === null || output.required_acks === undefined) {
        // required_acks can be 0
        data.required_acks = kafkaAcknowledgeReliabilityLevel.Commit;
      }
      // Clear fields that are only valid for specific auth_type values
      if (output.auth_type !== kafkaAuthType.None) {
        data.connection_type = undefined;
      }
      if (output.auth_type !== kafkaAuthType.Userpass) {
        data.username = undefined;
        data.password = undefined;
      }
      // Kafka does not support proxies — clear any proxy_id silently (#267281)
      data.proxy_id = null;
    }

    await remoteSyncIntegrationsCheck(esClient, output);

    const id = options?.id ? outputIdToUuid(options.id) : SavedObjectsUtils.generateId();

    // Store secret values if enabled; if not, store plain text values
    if (await isOutputSecretStorageEnabled(esClient, soClient)) {
      const { output: outputWithSecrets } = await extractAndWriteOutputSecrets({
        output,
        esClient,
        secretHashes: output.is_preconfigured ? options?.secretHashes : undefined,
      });

      if (outputWithSecrets.secrets) data.secrets = outputWithSecrets.secrets;
    } else {
      if (
        isBeatsOutput(output) &&
        isBeatsSOOutput(data) &&
        !output.ssl?.key &&
        output.secrets?.ssl?.key
      ) {
        data.ssl = JSON.stringify({
          ...output.ssl,
          ...output.secrets.ssl,
        });
      }

      if (output.type === outputType.Kafka && data.type === outputType.Kafka) {
        if (!output.password && output.secrets?.password) {
          data.password = output.secrets?.password as string;
        }
      } else if (
        output.type === outputType.RemoteElasticsearch &&
        data.type === outputType.RemoteElasticsearch
      ) {
        if (!output.service_token && output.secrets?.service_token) {
          data.service_token = output.secrets.service_token as string;
        }
      }
    }

    auditLoggingService.writeCustomSoAuditLog({
      action: 'create',
      id,
      name: data.name,
      savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
    });
    const newSo = await this.soClient.create<OutputSOAttributes>(SAVED_OBJECT_TYPE, data, {
      overwrite: options?.overwrite || options?.fromPreconfiguration,
      id,
    });
    logger.debug(`Created new output ${id}`);
    // soClient.create doesn't return the decrypted attributes, so we need to fetch it again.
    const retrievedSo = await this.encryptedSoClient.getDecryptedAsInternalUser<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      newSo.id
    );
    return outputSavedObjectToOutput(retrievedSo);
  }

  public async bulkGet(ids: string[], { ignoreNotFound = false } = { ignoreNotFound: true }) {
    if (ids.length === 0) {
      return [];
    }
    const decryptedSavedObjects = await pMap(
      ids,
      async (id) => {
        try {
          const decryptedSo =
            await this.encryptedSoClient.getDecryptedAsInternalUser<OutputSOAttributes>(
              SAVED_OBJECT_TYPE,
              outputIdToUuid(id)
            );
          return outputSavedObjectToOutput(decryptedSo);
        } catch (error: any) {
          if (ignoreNotFound && SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return undefined;
          }
          throw error;
        }
      },
      { concurrency: 50 } // Match the concurrency used in x-pack/platform/plugins/shared/encrypted_saved_objects/server/saved_objects/index.ts#L172
    );

    return decryptedSavedObjects.filter(
      (output): output is Output => typeof output !== 'undefined'
    );
  }

  public async list() {
    const outputsFinder =
      await this.encryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser<OutputSOAttributes>(
        {
          type: SAVED_OBJECT_TYPE,
          perPage: SO_SEARCH_LIMIT,
          sortField: 'is_default',
          sortOrder: 'desc',
        }
      );

    let outputs: SavedObject<OutputSOAttributes>[] = [];
    let total = 0;
    let page = 0;
    let perPage = 0;

    for await (const result of outputsFinder.find()) {
      outputs = result.saved_objects;
      total = result.total;
      page = result.page;
      perPage = result.per_page;
      break; // Return first page;
    }

    await outputsFinder.close();

    for (const output of outputs) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    return {
      items: outputs.map<Output>(outputSavedObjectToOutput),
      total,
      page,
      perPage,
    };
  }

  public async listPreconfigured() {
    // Use the plain (non-decrypting) soClient to avoid the cost of decrypting every output.
    // is_preconfigured is mapped with index:false so it cannot be used in a KQL filter;
    // filter client-side instead.
    const outputs = await this.soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      perPage: SO_SEARCH_LIMIT,
    });

    const preconfigured = outputs.saved_objects.filter(
      (so) => so.attributes.is_preconfigured === true
    );

    for (const output of preconfigured) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    const encryptedFieldKeys = [...OUTPUT_ENCRYPTED_FIELDS].map((f) => f.key);

    return {
      items: preconfigured.map<Output>((so) =>
        outputSavedObjectToOutput({
          ...so,
          attributes: omit(so.attributes, encryptedFieldKeys) as OutputSOAttributes,
        })
      ),
      total: preconfigured.length,
      page: 1,
      perPage: preconfigured.length,
    };
  }

  public async listAllForProxyId(proxyId: string) {
    const outputs = await this.soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      searchFields: ['proxy_id'],
      search: escapeSearchQueryPhrase(proxyId),
    });

    for (const output of outputs.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: outputs.page,
      perPage: outputs.per_page,
    };
  }

  public async get(id: string): Promise<Output> {
    const outputSO = await this.encryptedSoClient.getDecryptedAsInternalUser<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id)
    );

    auditLoggingService.writeCustomSoAuditLog({
      action: 'get',
      id: outputSO.id,
      name: outputSO?.attributes?.name,
      savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
    });

    return outputSavedObjectToOutput(outputSO);
  }

  public async delete(
    id: string,
    { fromPreconfiguration = false }: { fromPreconfiguration?: boolean } = {
      fromPreconfiguration: false,
    }
  ) {
    const logger = appContextService.getLogger();
    logger.debug(`Deleting output ${id}`);

    const originalOutput = await this.get(id);

    if (originalOutput.is_preconfigured && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(
        `Preconfigured output ${id} cannot be deleted outside of kibana config file.`
      );
    }

    if (originalOutput.is_default && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default output ${id} cannot be deleted.`);
    }

    if (originalOutput.is_default_monitoring && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default monitoring output ${id} cannot be deleted.`);
    }

    await packagePolicyService.removeOutputFromAll(
      appContextService.getInternalUserESClient(),
      id,
      {
        force: fromPreconfiguration,
      }
    );

    await agentPolicyService.removeOutputFromAll(appContextService.getInternalUserESClient(), id, {
      force: fromPreconfiguration,
    });

    auditLoggingService.writeCustomSoAuditLog({
      action: 'delete',
      id: outputIdToUuid(id),
      name: originalOutput.name,
      savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
    });

    const soDeleteResult = this.soClient.delete(SAVED_OBJECT_TYPE, outputIdToUuid(id));

    await deleteOutputSecrets({
      esClient: appContextService.getInternalUserESClient(),
      output: originalOutput,
    });
    logger.debug(`Deleted output ${id}`);
    return soDeleteResult;
  }

  public async update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    data: UpdateOutput,
    {
      fromPreconfiguration = false,
      secretHashes,
    }: { fromPreconfiguration: boolean; secretHashes?: Record<string, any> } = {
      fromPreconfiguration: false,
    }
  ) {
    const logger = appContextService.getLogger();
    logger.debug(`Updating output ${id}`);

    let secretsToDelete: SecretReference[] = [];
    const originalOutput = await this.get(id);

    this._validateFieldsAreEditable(originalOutput, data, id, fromPreconfiguration);
    if (
      (originalOutput.is_default && data.is_default === false) ||
      (data.is_default_monitoring === false && originalOutput.is_default_monitoring)
    ) {
      throw new OutputUnauthorizedError(
        `Default output ${id} cannot be set to is_default=false or is_default_monitoring=false manually. Make another output the default first.`
      );
    }

    const mergedType = data.type ?? originalOutput.type;
    const mergedIsDefault = data.is_default ?? originalOutput.is_default;
    const isTypeChanged = mergedType !== originalOutput.type;

    await this.assertOtlpOutputAllowed({ type: mergedType }, esClient, soClient);

    const typedFullUpdateData = { ...data, type: mergedType } as UpdateTypedOutput;
    await validateOutputServerless(this, typedFullUpdateData, id);
    const isPreconfigured = (fromPreconfiguration || originalOutput.is_preconfigured) ?? false;
    this._runOutputValidators(typedFullUpdateData, isPreconfigured);

    // type is always defined here after merging; ssl/secrets omitted at runtime but allowed on the type.
    const updateData = {
      ...omit(data, ['ssl', 'secrets']),
      type: mergedType,
    } as Nullable<Partial<OutputSOAttributes>> & {
      type: ValueOf<OutputType>;
    };

    if (outputTypeSupportPresets(updateData)) {
      if (
        updateData.preset === 'balanced' &&
        outputYmlIncludesReservedPerformanceKey(updateData.config_yaml ?? '', parse)
      ) {
        throw new OutputInvalidError(
          `preset cannot be balanced when config_yaml contains one of ${RESERVED_CONFIG_YML_KEYS.join(
            ', '
          )}`
        );
      }
    }

    const defaultDataOutputId = await this.getDefaultDataOutputId();
    if (isTypeChanged || originalOutput.is_default !== mergedIsDefault) {
      await validateTypeChanges(
        esClient,
        id,
        updateData,
        originalOutput,
        defaultDataOutputId,
        fromPreconfiguration
      );
    }

    const removeKafkaFields = (target: Nullable<Partial<OutputSoKafkaAttributes>>) => {
      target.version = null;
      target.key = null;
      target.compression = null;
      target.compression_level = null;
      target.connection_type = null;
      target.client_id = null;
      target.auth_type = null;
      target.username = null;
      target.password = null;
      target.sasl = null;
      target.partition = null;
      target.random = null;
      target.round_robin = null;
      target.hash = null;
      target.topic = null;
      target.headers = null;
      target.timeout = null;
      target.broker_timeout = null;
      target.required_acks = null;
      target.ssl = null;
    };

    const removeBeatsFields = (target: Nullable<Partial<BeatsSoBaseAttributes>>) => {
      target.hosts = null;
      target.ca_sha256 = null;
      target.ca_trusted_fingerprint = null;
      target.config_yaml = null;
      target.ssl = null;
      target.shipper = null;
      target.preset = null;
      target.proxy_id = null;
      target.write_to_logs_streams = null;
      target.otel_exporter_config_yaml = null;
      target.otel_disable_beatsauth = null;
    };

    // Null out fields that are exclusive to HTTP when switching to gRPC.
    const removeOtlpHttpFields = (target: Nullable<Partial<OtlpHttpExporterConfig>>) => {
      target.encoding = null;
      target.traces_endpoint = null;
      target.metrics_endpoint = null;
      target.logs_endpoint = null;
      target.profiles_endpoint = null;
      target.proxy_url = null;
      target.max_idle_conns = null;
      target.max_idle_conns_per_host = null;
      target.max_conns_per_host = null;
      target.idle_conn_timeout = null;
      target.disable_keep_alives = null;
      target.http2_read_idle_timeout = null;
      target.http2_ping_timeout = null;
      target.force_attempt_http2 = null;
      target.compression_params = null;
      target.cookies = null;
    };

    // Null out fields that are exclusive to gRPC when switching to HTTP.
    const removeOtlpGrpcFields = (
      target: Nullable<Partial<OtlpGrpcExporterConfig>>,
      original: { compression?: string }
    ) => {
      target.balancer_name = null;
      target.keepalive = null;
      target.wait_for_ready = null;
      target.user_agent = null;
      target.authority = null;
      // compression is valid on both protocols but snappy/zstd are gRPC-only. The stored value
      // survives the deep merge, so clear it — unless this update supplies its own (already
      // validated against the HTTP schema).
      if (
        target.compression === undefined &&
        original.compression !== undefined &&
        OTLP_GRPC_ONLY_COMPRESSION_TYPES.includes(original.compression)
      ) {
        target.compression = null;
      }
    };

    if (isTypeChanged) {
      if (updateData.type === outputType.Elasticsearch) {
        updateData.preset = null;
      }

      if (updateData.type !== outputType.Kafka && originalOutput.type === outputType.Kafka) {
        removeKafkaFields(updateData as Nullable<OutputSoKafkaAttributes>);
      }

      if (originalOutput.type === outputType.RemoteElasticsearch) {
        (updateData as Nullable<OutputSoRemoteElasticsearchAttributes>).service_token = null;
        (updateData as Nullable<OutputSoRemoteElasticsearchAttributes>).kibana_api_key = null;
      }

      if (
        originalOutput.type === outputType.Elasticsearch ||
        originalOutput.type === outputType.RemoteElasticsearch
      ) {
        (updateData as Nullable<BeatsSoBaseAttributes>).write_to_logs_streams = null;
        (updateData as Nullable<BeatsSoBaseAttributes>).otel_exporter_config_yaml = null;
        (updateData as Nullable<BeatsSoBaseAttributes>).otel_disable_beatsauth = null;
      }

      if (updateData.type === outputType.Logstash) {
        // remove ES specific field
        (updateData as BeatsSoBaseAttributes).ca_trusted_fingerprint = null;
        (updateData as BeatsSoBaseAttributes).ca_sha256 = null;
      }

      if (updateData.type === outputType.Kafka) {
        updateData.ca_trusted_fingerprint = null;
        updateData.ca_sha256 = null;

        if (!updateData.version) {
          updateData.version = '1.0.0';
        }
        if (!updateData.compression) {
          updateData.compression = kafkaCompressionType.Gzip;
        }
        if (
          !updateData.compression ||
          (updateData.compression === kafkaCompressionType.Gzip && !updateData.compression_level)
        ) {
          updateData.compression_level = 4;
        }
        if (updateData.compression && updateData.compression !== kafkaCompressionType.Gzip) {
          // Clear compression level if compression is not gzip
          updateData.compression_level = null;
        }

        if (!updateData.client_id) {
          updateData.client_id = 'Elastic';
        }
        if (updateData.username && updateData.password && !updateData.sasl?.mechanism) {
          updateData.sasl = {
            mechanism: kafkaSaslMechanism.Plain,
          };
        }
        if (!updateData.partition) {
          updateData.partition = kafkaPartitionType.Hash;
        }
        if (
          updateData.partition === kafkaPartitionType.Random &&
          !updateData.random?.group_events
        ) {
          updateData.random = {
            group_events: 1,
          };
        }
        if (
          updateData.partition === kafkaPartitionType.RoundRobin &&
          !updateData.round_robin?.group_events
        ) {
          updateData.round_robin = {
            group_events: 1,
          };
        }
        if (!updateData.timeout) {
          updateData.timeout = 30;
        }
        if (!updateData.broker_timeout) {
          updateData.broker_timeout = 10;
        }
        if (updateData.required_acks === null || updateData.required_acks === undefined) {
          // required_acks can be 0
          updateData.required_acks = kafkaAcknowledgeReliabilityLevel.Commit;
        }
        // Clear fields that are only valid for specific auth_type values
        if (updateData.auth_type && updateData.auth_type !== kafkaAuthType.None) {
          updateData.connection_type = null;
        }
        if (updateData.auth_type && updateData.auth_type !== kafkaAuthType.Userpass) {
          updateData.username = null;
          updateData.password = null;
        }
      }

      if (isOtlpOutput(originalOutput)) {
        // clear OTLP-only fields when leaving OTLP; secrets cleaned up via getOutputSecretPaths
        (updateData as Nullable<OutputSoOtlpAttributes>).otlp_exporter = null;
      }

      if (isOtlpOutput(updateData)) {
        // clear beats-only fields when switching to OTLP
        removeBeatsFields(updateData as Nullable<BeatsSoBaseAttributes>);
      }
    }

    const isOtlpProtocolChange =
      isOtlpOutput(updateData) &&
      isOtlpOutput(originalOutput) &&
      updateData.otlp_exporter?.protocol !== undefined &&
      updateData.otlp_exporter.protocol !== originalOutput.otlp_exporter.protocol;

    if (isOtlpProtocolChange && isOtlpOutput(updateData) && isOtlpOutput(originalOutput)) {
      const exporterUpdate = updateData.otlp_exporter;
      if (exporterUpdate.protocol === otlpProtocol.Grpc) {
        // Switching to gRPC — null out HTTP-exclusive fields left over in the stored SO
        removeOtlpHttpFields(
          exporterUpdate as unknown as Nullable<Partial<OtlpHttpExporterConfig>>
        );
      } else {
        // Switching to HTTP — null out gRPC-exclusive fields left over in the stored SO
        removeOtlpGrpcFields(
          exporterUpdate as unknown as Nullable<Partial<OtlpGrpcExporterConfig>>,
          originalOutput.otlp_exporter
        );
      }
    }

    if (isBeatsOutput(updateData) && isBeatsOutput(typedFullUpdateData)) {
      // ssl is omitted from updateSoData so must be read from the incoming domain payload
      const ssl = typedFullUpdateData?.ssl;
      if (ssl) {
        updateData.ssl = JSON.stringify(ssl);
      } else if (ssl === null) {
        // Explicitly set to null to allow to delete the field
        updateData.ssl = null;
      }
    }

    if (typedFullUpdateData.type === outputType.Kafka && updateData.type === outputType.Kafka) {
      if (!typedFullUpdateData.password) {
        updateData.password = null;
      }
      if (!typedFullUpdateData.username) {
        updateData.username = null;
      }
      if (!typedFullUpdateData.sasl) {
        updateData.sasl = null;
      }
      if (!typedFullUpdateData.ssl) {
        updateData.ssl = null;
      }
    }

    // ensure only default output exists
    if (data.is_default) {
      if (defaultDataOutputId && defaultDataOutputId !== id) {
        await this._updateDefaultOutput(
          defaultDataOutputId,
          { is_default: false },
          fromPreconfiguration
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId();

      if (defaultMonitoringOutputId && defaultMonitoringOutputId !== id) {
        await this._updateDefaultOutput(
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          fromPreconfiguration
        );
      }
    }

    if (outputTypeSupportPresets(updateData) && updateData.hosts) {
      updateData.hosts = updateData.hosts.map(normalizeHostsForAgents);
    }

    // Kafka does not support proxies — clear any proxy_id silently (#267281)
    if (updateData.type === outputType.Kafka) {
      (updateData as Nullable<BeatsSoBaseAttributes>).proxy_id = null;
    }

    if (
      typedFullUpdateData.type === outputType.RemoteElasticsearch &&
      updateData.type === outputType.RemoteElasticsearch
    ) {
      if (!typedFullUpdateData.service_token) {
        updateData.service_token = null;
      }
      if (!typedFullUpdateData.kibana_api_key) {
        updateData.kibana_api_key = null;
      }
    }

    if (
      outputTypeSupportPresets(updateData) &&
      !updateData.preset &&
      (updateData.config_yaml !== undefined || isTypeChanged)
    ) {
      updateData.preset = getDefaultPresetForEsOutput(updateData.config_yaml ?? '', parse);
    }

    // Remove the shipper data if the shipper is not enabled from the yaml config
    if (isBeatsOutput(updateData)) {
      if (!updateData.config_yaml && updateData.shipper) {
        updateData.shipper = null;
      }
      if (updateData.config_yaml) {
        const configJs = parse(updateData.config_yaml);
        const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

        if (isShipperDisabled && updateData.shipper) {
          updateData.shipper = null;
        }
      }
    }
    await remoteSyncIntegrationsCheck(esClient, data);

    // Store secret values if enabled; if not, store plain text values
    if (await isOutputSecretStorageEnabled(esClient, soClient)) {
      const secretsRes = await extractAndUpdateOutputSecrets({
        oldOutput: originalOutput,
        outputUpdate: data,
        esClient,
        secretHashes: data.is_preconfigured ? secretHashes : undefined,
      });

      updateData.secrets = secretsRes.outputUpdate.secrets;
      secretsToDelete = secretsRes.secretsToDelete;
    } else {
      if (isBeatsOutput(typedFullUpdateData) && isBeatsOutput(updateData)) {
        if (!typedFullUpdateData.ssl?.key && typedFullUpdateData.secrets?.ssl?.key) {
          updateData.ssl = JSON.stringify({
            ...typedFullUpdateData.ssl,
            ...typedFullUpdateData.secrets.ssl,
          });
        }
      }
      if (updateData.type === outputType.Kafka && typedFullUpdateData.type === outputType.Kafka) {
        if (!typedFullUpdateData.password && typedFullUpdateData.secrets?.password) {
          updateData.password = typedFullUpdateData.secrets.password as string;
        }
      } else if (
        updateData.type === outputType.RemoteElasticsearch &&
        typedFullUpdateData.type === outputType.RemoteElasticsearch
      ) {
        if (!typedFullUpdateData.service_token && typedFullUpdateData.secrets?.service_token) {
          updateData.service_token = typedFullUpdateData.secrets.service_token as string;
        }
      }
    }

    patchUpdateDataWithRequireEncryptedAADFields(updateData, originalOutput);

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: outputIdToUuid(id),
      name: originalOutput.name,
      savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
    });

    await this.soClient.update<Nullable<OutputSOAttributes>>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id),
      updateData
    );

    if (secretsToDelete.length) {
      try {
        await deleteSecrets({ esClient, ids: secretsToDelete.map((s) => s.id) });
      } catch (err) {
        logger.warn(`Error cleaning up secrets for output ${id}: ${err.message}`);
      }
    }
    logger.debug(`Updated output ${id}`);
  }

  public async backfillAllOutputPresets(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ) {
    // Only ES/remote-ES outputs missing a preset need backfilling. Query for just those to avoid
    // decrypting every output, and bail out early when there are none.
    const outputsWithoutPreset = await this.soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      perPage: SO_SEARCH_LIMIT,
      filter:
        `(${OUTPUT_SAVED_OBJECT_TYPE}.attributes.type:${outputType.Elasticsearch} or ` +
        `${OUTPUT_SAVED_OBJECT_TYPE}.attributes.type:${outputType.RemoteElasticsearch}) and ` +
        `not ${OUTPUT_SAVED_OBJECT_TYPE}.attributes.preset:*`,
    });

    if (!outputsWithoutPreset.saved_objects.length) {
      return;
    }

    for (const output of outputsWithoutPreset.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: output.id,
        name: output.attributes.name,
        savedObjectType: OUTPUT_SAVED_OBJECT_TYPE,
      });
    }

    await pMap(
      outputsWithoutPreset.saved_objects.map<Output>(outputSavedObjectToOutput),
      async (output) => {
        if (!isBeatsOutput(output)) return;
        const preset = getDefaultPresetForEsOutput(output.config_yaml ?? '', parse);

        await outputService.update(
          soClient,
          esClient,
          output.id,
          { preset },
          { fromPreconfiguration: true }
        );
        await agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, output.id, {
          isDefault: output.is_default,
          isDefaultMonitoring: output.is_default_monitoring,
        });
      },
      {
        concurrency: MAX_CONCURRENT_BACKFILL_OUTPUTS_PRESETS,
      }
    );
  }

  async getLatestOutputHealth(esClient: ElasticsearchClient, id: string): Promise<OutputHealth> {
    const lastUpdateTime = await this.getOutputLastUpdateTime(id);

    const mustFilter = [];
    if (lastUpdateTime) {
      mustFilter.push({
        range: {
          '@timestamp': {
            gte: lastUpdateTime,
          },
        },
      });
    }

    const response = await esClient.search(
      {
        index: OUTPUT_HEALTH_DATA_STREAM,
        query: { bool: { filter: { term: { output: id } }, must: mustFilter } },
        sort: { '@timestamp': 'desc' },
        size: 1,
      },
      { ignore: [404] }
    );

    if (!response.hits || response.hits.hits.length === 0) {
      return {
        state: 'UNKNOWN',
        message: '',
        timestamp: '',
      };
    }
    const latestHit = response.hits.hits[0]._source as any;
    return {
      state: latestHit.state,
      message: latestHit.message ?? '',
      timestamp: latestHit['@timestamp'],
    };
  }

  private _runOutputValidators(
    output: UpdateTypedOutput | NewOutput,
    isPreconfigured: boolean
  ): void {
    try {
      if (isBeatsOutput(output)) {
        validateOutputSslPaths(output);
      }
      ensureNoDuplicateSecrets(output);
    } catch (e) {
      if (isPreconfigured && e instanceof OutputInvalidError) {
        appContextService.getLogger().warn(`Preconfigured output failed validation: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  async getOutputLastUpdateTime(id: string): Promise<string | undefined> {
    const outputSO = await this.soClient.get<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id)
    );

    return outputSO.updated_at;
  }
}

interface OutputHealth {
  state: string;
  message: string;
  timestamp: string;
}

export const outputService = new OutputService();
