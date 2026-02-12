/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { load } from 'js-yaml';
import deepMerge from 'deepmerge';
import { set } from '@kbn/safer-lodash-set';

import {
  getDefaultPresetForEsOutput,
  outputTypeSupportPresets,
} from '../../../common/services/output_helpers';

import type {
  FullAgentPolicy,
  PackagePolicy,
  Output,
  ShipperOutput,
  FullAgentPolicyOutput,
  FleetProxy,
  FleetServerHost,
  AgentPolicy,
} from '../../types';
import type {
  DownloadSource,
  FullAgentPolicyDownload,
  FullAgentPolicyInput,
  FullAgentPolicyMonitoring,
  FullAgentPolicyOutputPermissions,
  PackageInfo,
} from '../../../common/types';
import { agentPolicyService } from '../agent_policy';
import {
  dataTypes,
  kafkaCompressionType,
  OTEL_COLLECTOR_INPUT_TYPE,
  outputType,
  PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES,
} from '../../../common/constants';
import { getSettingsValuesForAgentPolicy } from '../form_settings';
import { getPackageInfo } from '../epm/packages';
import { pkgToPkgKey, splitPkgKey } from '../epm/registry';
import { appContextService } from '../app_context';

import {
  getFleetServerHostsSecretReferences,
  getOutputSecretReferences,
  getDownloadSourceSecretReferences,
} from '../secrets';

import { getOutputIdForAgentPolicy } from '../../../common/services/output_helpers';

import { getMonitoringPermissions } from './monitoring_permissions';
import { storedPackagePoliciesToAgentInputs } from '.';
import {
  storedPackagePoliciesToAgentPermissions,
  DEFAULT_CLUSTER_PERMISSIONS,
} from './package_policies_to_agent_permissions';
import { fetchRelatedSavedObjects } from './related_saved_objects';
import { generateOtelcolConfig } from './otel_collector';

async function fetchAgentPolicy(soClient: SavedObjectsClientContract, id: string) {
  try {
    return await agentPolicyService.get(soClient, id);
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }
  return null;
}

export async function getFullAgentPolicy(
  soClient: SavedObjectsClientContract,
  id: string,
  options?: { standalone?: boolean; agentPolicy?: AgentPolicy; agentVersion?: string }
): Promise<FullAgentPolicy | null> {
  const logger = appContextService.getLogger().get('getFullAgentPolicy');

  const experimentalFeature = appContextService.getExperimentalFeatures();

  logger.debug(
    `Getting full policy for agent policy [${id}] using so scoped to [${soClient.getCurrentNamespace()}]`
  );

  const standalone = options?.standalone ?? false;

  let agentPolicy: AgentPolicy | null;
  if (options?.agentPolicy?.package_policies) {
    logger.debug(`agent policy [${id}] was provided via options.agentPolicy - no need to fetch it`);
    agentPolicy = options.agentPolicy;
  } else {
    logger.debug(`Fetching agent policy doc for [${id}]`);
    agentPolicy = await fetchAgentPolicy(soClient, id);
  }

  if (!agentPolicy) {
    logger.debug(`Agent policy [${id}] was not found. Exiting.`);
    return null;
  }

  logger.debug(`fetching related saved objects for agent policy [${id}]`);

  const {
    outputs,
    proxies,
    dataOutput,
    fleetServerHost,
    monitoringOutput,
    downloadSource,
    downloadSourceProxy,
  } = await fetchRelatedSavedObjects(soClient, agentPolicy);

  // Build up an in-memory object for looking up Package Info, so we don't have
  // call `getPackageInfo` for every single policy, which incurs performance costs
  const packageInfoCache = new Map<string, PackageInfo>();
  for (const policy of agentPolicy.package_policies as PackagePolicy[]) {
    if (!policy.package || packageInfoCache.has(pkgToPkgKey(policy.package))) {
      continue;
    }

    // Prime the cache w/ just the package key - we'll fetch all the package
    // info concurrently below
    packageInfoCache.set(pkgToPkgKey(policy.package), {} as PackageInfo);
  }

  logger.debug(
    () => `fetching info for packages:${JSON.stringify(Array.from(packageInfoCache.keys()))}`
  );

  // Fetch all package info concurrently
  await Promise.all(
    Array.from(packageInfoCache.keys()).map(async (pkgKey) => {
      const { pkgName, pkgVersion } = splitPkgKey(pkgKey);

      const packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName,
        pkgVersion,
      });

      packageInfoCache.set(pkgKey, packageInfo);
    })
  );
  const bootstrapOutputConfig = generateFleetServerOutputSSLConfig(fleetServerHost);

  logger.debug(() => `Fetching agent inputs for policy [${id}]`);

  const agentInputs = await storedPackagePoliciesToAgentInputs(
    agentPolicy.package_policies as PackagePolicy[],
    packageInfoCache,
    getOutputIdForAgentPolicy(dataOutput),
    agentPolicy.namespace,
    agentPolicy.global_data_tags,
    options?.agentVersion,
    soClient,
    agentPolicy.has_agent_version_conditions
  );

  let otelcolConfig;
  if (experimentalFeature.enableOtelIntegrations) {
    otelcolConfig = generateOtelcolConfig(agentInputs, dataOutput, packageInfoCache);
  }

  const inputs = agentInputs
    // filter out the otelcol inputs, they will be added at the root of the policy
    .filter((input) => input.type !== OTEL_COLLECTOR_INPUT_TYPE)
    .map((input) => {
      // fix output id for default output
      const output = outputs.find(({ id: outputId }) => input.use_output === outputId);
      if (output) {
        input.use_output = getOutputIdForAgentPolicy(output);
      }
      if (input.type === 'fleet-server' && fleetServerHost) {
        const sslInputConfig = generateSSLConfigForFleetServerInput(fleetServerHost);
        if (sslInputConfig) {
          input = {
            ...input,
            ...sslInputConfig,
            ...(bootstrapOutputConfig
              ? { use_output: `fleetserver-output-${fleetServerHost.id}` }
              : {}),
          };
        }
      }
      return input;
    });

  const features = (agentPolicy.agent_features || []).reduce((acc, { name, ...featureConfig }) => {
    acc[name] = featureConfig;
    return acc;
  }, {} as NonNullable<FullAgentPolicy['agent']>['features']);

  const outputSecretReferences = outputs.flatMap((output) => getOutputSecretReferences(output));
  const fleetserverHostSecretReferences = fleetServerHost
    ? getFleetServerHostsSecretReferences(fleetServerHost)
    : [];
  const downloadSourceSecretReferences = downloadSource
    ? getDownloadSourceSecretReferences(downloadSource)
    : [];
  const packagePolicySecretReferences = (agentPolicy?.package_policies || []).flatMap(
    (policy) => policy.secret_references || []
  );

  const fullAgentPolicy: FullAgentPolicy = {
    id: agentPolicy.id,
    outputs: {
      ...(bootstrapOutputConfig ? bootstrapOutputConfig : {}),
      ...outputs.reduce<FullAgentPolicy['outputs']>((acc, output) => {
        acc[getOutputIdForAgentPolicy(output)] = transformOutputToFullPolicyOutput(
          output,
          output.proxy_id ? proxies.find((proxy) => output.proxy_id === proxy.id) : undefined,
          standalone
        );
        return acc;
      }, {}),
    },
    inputs,
    ...(otelcolConfig ? otelcolConfig : {}),
    secret_references: [
      ...outputSecretReferences,
      ...fleetserverHostSecretReferences,
      ...downloadSourceSecretReferences,
      ...packagePolicySecretReferences,
    ],
    revision: agentPolicy.revision,
    agent: {
      download: getBinarySourceSettings(downloadSource, downloadSourceProxy),
      monitoring: getFullMonitoringSettings(agentPolicy, monitoringOutput),
      features,
      protection: {
        enabled: agentPolicy.is_protected,
        uninstall_token_hash: '',
        signing_key: '',
      },
    },
    signed: {
      data: '',
      signature: '',
    },
  };

  if (agentPolicy.space_ids) {
    fullAgentPolicy.namespaces = agentPolicy.space_ids;
  }

  const packagePoliciesByOutputId = Object.keys(fullAgentPolicy.outputs).reduce(
    (acc: Record<string, PackagePolicy[]>, outputId) => {
      acc[outputId] = [];
      return acc;
    },
    {}
  );
  (agentPolicy.package_policies || []).forEach((packagePolicy) => {
    const packagePolicyDataOutput = packagePolicy.output_id
      ? outputs.find((output) => output.id === packagePolicy.output_id)
      : undefined;
    if (packagePolicyDataOutput) {
      packagePoliciesByOutputId[getOutputIdForAgentPolicy(packagePolicyDataOutput)].push(
        packagePolicy
      );
    } else {
      packagePoliciesByOutputId[getOutputIdForAgentPolicy(dataOutput)].push(packagePolicy);
    }
  });

  const dataPermissionsByOutputId = Object.keys(fullAgentPolicy.outputs).reduce(
    (acc: Record<string, FullAgentPolicyOutputPermissions>, outputId) => {
      acc[outputId] = {};
      return acc;
    },
    {}
  );
  for (const [outputId, packagePolicies] of Object.entries(packagePoliciesByOutputId)) {
    const dataPermissions = storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      agentPolicy.namespace,
      packagePolicies,
      agentInputs
    );
    dataPermissionsByOutputId[outputId] = {
      _elastic_agent_checks: {
        cluster: DEFAULT_CLUSTER_PERMISSIONS,
      },
      ...(dataPermissions || {}),
    };
  }

  const monitoringPermissions = await getMonitoringPermissions(
    soClient,
    {
      logs: agentPolicy.monitoring_enabled?.includes(dataTypes.Logs) ?? false,
      metrics: agentPolicy.monitoring_enabled?.includes(dataTypes.Metrics) ?? false,
      traces: agentPolicy.monitoring_enabled?.includes(dataTypes.Traces) ?? false,
    },
    agentPolicy.namespace
  );
  monitoringPermissions._elastic_agent_checks = {
    cluster: DEFAULT_CLUSTER_PERMISSIONS,
  };

  // Only add permissions if output.type is "elasticsearch"
  fullAgentPolicy.output_permissions = Object.keys(fullAgentPolicy.outputs).reduce<
    NonNullable<FullAgentPolicy['output_permissions']>
  >((outputPermissions, outputId) => {
    const output = fullAgentPolicy.outputs[outputId];
    if (
      output &&
      (output.type === outputType.Elasticsearch || output.type === outputType.RemoteElasticsearch)
    ) {
      const permissions: FullAgentPolicyOutputPermissions = {};
      if (outputId === getOutputIdForAgentPolicy(monitoringOutput)) {
        Object.assign(permissions, monitoringPermissions);
      }

      if (
        outputId === getOutputIdForAgentPolicy(dataOutput) ||
        packagePoliciesByOutputId[outputId].length > 0
      ) {
        Object.assign(permissions, dataPermissionsByOutputId[outputId]);
      }

      // Add logs-* permissions for outputs with write_to_streams enabled
      const originalOutput = outputs.find((o) => getOutputIdForAgentPolicy(o) === outputId);
      if (originalOutput?.write_to_logs_streams) {
        const streamsPermissions = {
          _write_to_logs_streams: {
            indices: [
              {
                names: ['logs', 'logs.*'],
                privileges: PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES,
              },
            ],
          },
        };
        Object.assign(permissions, streamsPermissions);
      }

      outputPermissions[outputId] = permissions;
    }
    return outputPermissions;
  }, {});

  // only add fleet server hosts if not in standalone
  if (!standalone && fleetServerHost) {
    fullAgentPolicy.fleet = generateFleetConfig(fleetServerHost, proxies);
  }

  const settingsValues = getSettingsValuesForAgentPolicy(
    'AGENT_POLICY_ADVANCED_SETTINGS',
    agentPolicy
  );
  Object.entries(settingsValues).forEach(([settingsKey, settingValue]) => {
    set(fullAgentPolicy, settingsKey, settingValue);
  });

  // populate protection and signed properties
  const messageSigningService = appContextService.getMessageSigningService();
  if (options?.standalone !== true && messageSigningService && fullAgentPolicy.agent) {
    logger.debug(`Retrieving message signing service and signing policy data`);

    const publicKey = await messageSigningService.getPublicKey();
    const tokenHash =
      (await appContextService
        .getUninstallTokenService()
        ?.scoped(soClient.getCurrentNamespace())
        ?.getHashedTokenForPolicyId(fullAgentPolicy.id)) ?? '';

    fullAgentPolicy.agent.protection = {
      enabled: agentPolicy.is_protected,
      uninstall_token_hash: tokenHash,
      signing_key: publicKey,
    };

    const dataToSign = {
      id: fullAgentPolicy.id,
      agent: {
        features,
        protection: fullAgentPolicy.agent.protection,
      },
      inputs: inputs.map(({ id: inputId, name, revision, type }) => ({
        id: inputId,
        name,
        revision,
        type,
      })),
    };

    const { data: signedData, signature } = await messageSigningService.sign(dataToSign);
    fullAgentPolicy.signed = {
      data: signedData.toString('base64'),
      signature,
    };

    logger.debug(`Policy [${fullAgentPolicy.id}] was signed`);
  }

  if (agentPolicy.overrides) {
    return deepMerge<FullAgentPolicy>(fullAgentPolicy, agentPolicy.overrides);
  }
  if (options?.standalone) {
    delete fullAgentPolicy.agent?.protection;
    delete fullAgentPolicy.signed;
  }

  logger.debug(`Building of full agent policy for [${id}] done.`);

  return fullAgentPolicy;
}

export function generateFleetConfig(
  fleetServerHost: FleetServerHost,
  proxies: FleetProxy[]
): FullAgentPolicy['fleet'] {
  const config: FullAgentPolicy['fleet'] = {
    hosts: fleetServerHost.host_urls,
  };

  // generating the ssl configs for checking into Fleet
  // These correspond to --certificate-authorities, --elastic-agent-cert and --elastic-agent-cert-key cli options
  if (
    fleetServerHost.ssl?.agent_certificate_authorities ||
    fleetServerHost.ssl?.agent_certificate ||
    fleetServerHost.ssl?.agent_key
  ) {
    config.ssl = {
      ...(fleetServerHost.ssl.agent_certificate_authorities && {
        certificate_authorities: fleetServerHost.ssl.agent_certificate_authorities,
      }),
      ...(fleetServerHost.ssl?.agent_certificate && {
        certificate: fleetServerHost.ssl.agent_certificate,
      }),
      ...(fleetServerHost.ssl?.agent_key &&
        !fleetServerHost.secrets?.ssl?.agent_key && {
          key: fleetServerHost.ssl.agent_key,
        }),
    };
  }
  // if both ssl.agent_key and secrets.ssl.agent_key are present, prefer the secrets'
  if (fleetServerHost.secrets?.ssl?.agent_key) {
    config.secrets = {
      ssl: { key: fleetServerHost.secrets?.ssl?.agent_key },
    };
  }

  const fleetServerHostproxy = fleetServerHost.proxy_id
    ? proxies.find((proxy) => proxy.id === fleetServerHost.proxy_id)
    : null;
  if (fleetServerHostproxy) {
    config.proxy_url = fleetServerHostproxy.url;
    if (fleetServerHostproxy.proxy_headers) {
      config.proxy_headers = fleetServerHostproxy.proxy_headers;
    }
    if (
      fleetServerHostproxy.certificate_authorities ||
      fleetServerHostproxy.certificate ||
      fleetServerHostproxy.certificate_key
    ) {
      config.ssl = {
        renegotiation: 'never',
        verification_mode: '',
        ...(fleetServerHostproxy.certificate_authorities && {
          certificate_authorities: [fleetServerHostproxy.certificate_authorities],
        }),
        ...(fleetServerHostproxy.certificate && { certificate: fleetServerHostproxy.certificate }),
        ...(fleetServerHostproxy.certificate_key && { key: fleetServerHostproxy.certificate_key }),
      };
    }
  }

  return config;
}

// Generate the SSL configs for fleet-server type input
// Corresponding to --fleet-server-cert, --fleet-server-cert-key, --certificate-authorites cli options
function generateSSLConfigForFleetServerInput(fleetServerHost: FleetServerHost) {
  const inputConfig: Partial<FullAgentPolicyInput> = {};

  if (fleetServerHost?.ssl) {
    inputConfig.ssl = {
      ...(fleetServerHost.ssl.certificate_authorities && {
        certificate_authorities: fleetServerHost.ssl.certificate_authorities,
      }),
      ...(fleetServerHost.ssl.certificate && {
        certificate: fleetServerHost.ssl.certificate,
      }),
      ...(fleetServerHost.ssl.key &&
        !fleetServerHost?.secrets?.ssl?.key && {
          key: fleetServerHost.ssl.key,
        }),
      ...(fleetServerHost.ssl.client_auth && {
        client_authentication: fleetServerHost.ssl.client_auth,
      }),
    };
  }
  // if both ssl.key and secrets.ssl.key are present, prefer the secrets'
  if (fleetServerHost?.secrets) {
    inputConfig.secrets = {
      ...(fleetServerHost?.secrets?.ssl?.key && {
        ssl: { key: fleetServerHost.secrets?.ssl?.key },
      }),
    };
  }
  return inputConfig;
}

export function transformOutputToFullPolicyOutput(
  output: Output,
  proxy?: FleetProxy,
  standalone = false
): FullAgentPolicyOutput {
  const {
    config_yaml,
    type,
    hosts,
    ca_sha256,
    ca_trusted_fingerprint,
    ssl,
    shipper,
    secrets,
    preset,
  } = output;

  const configJs = config_yaml ? load(config_yaml) : {};

  // build logic to read config_yaml and transform it with the new shipper data
  const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;
  let shipperDiskQueueData = {};
  let generalShipperData;
  let kafkaData = {};

  if (type === outputType.Kafka) {
    const {
      client_id,
      version,
      key,
      compression,
      compression_level,
      username,
      password,
      sasl,
      partition,
      random,
      round_robin,
      hash,
      topic,
      headers,
      timeout,
      broker_timeout,
      required_acks,
    } = output;

    const transformPartition = () => {
      if (!partition) return {};
      switch (partition) {
        case 'random':
          return {
            random: {
              ...(random?.group_events
                ? { group_events: random.group_events }
                : { group_events: 1 }),
            },
          };
        case 'round_robin':
          return {
            round_robin: {
              ...(round_robin?.group_events
                ? { group_events: round_robin.group_events }
                : { group_events: 1 }),
            },
          };
        case 'hash':
        default:
          return { hash: { ...(hash?.hash ? { hash: hash.hash } : { hash: '' }) } };
      }
    };

    kafkaData = {
      client_id,
      version,
      key,
      compression,
      ...(compression === kafkaCompressionType.Gzip ? { compression_level } : {}),
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
      ...(sasl ? { sasl } : {}),
      partition: transformPartition(),
      topic,
      headers: (headers ?? []).filter((item) => item.key !== '' || item.value !== ''),
      timeout,
      broker_timeout,
      required_acks,
    };
  }

  if (shipper) {
    if (!isShipperDisabled) {
      shipperDiskQueueData = buildShipperQueueData(shipper);
    }
    const {
      loadbalance,
      compression_level,
      queue_flush_timeout,
      max_batch_bytes,
      mem_queue_events,
    } = shipper;

    generalShipperData = {
      loadbalance,
      compression_level,
      queue_flush_timeout,
      max_batch_bytes,
      mem_queue_events,
    };
  }

  const newOutput: FullAgentPolicyOutput = {
    ...configJs,
    ...shipperDiskQueueData,
    type,
    hosts,
    ...kafkaData,
    ...(!isShipperDisabled ? generalShipperData : {}),
    ...(ca_sha256 ? { ca_sha256 } : {}),
    ...(ca_trusted_fingerprint ? { 'ssl.ca_trusted_fingerprint': ca_trusted_fingerprint } : {}),
    ...(secrets ? { secrets } : {}),
  };
  if (ssl) {
    newOutput.ssl = {
      ...ssl, // ssl coming from preconfig
      ...newOutput.ssl, // ssl coming from config_yaml
    };
  }

  if (proxy) {
    newOutput.proxy_url = proxy.url;
    if (proxy.proxy_headers) {
      newOutput.proxy_headers = proxy.proxy_headers;
    }

    if (proxy.certificate_authorities) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      if (!newOutput.ssl.certificate_authorities) {
        newOutput.ssl.certificate_authorities = [];
      }
      newOutput.ssl.certificate_authorities.push(proxy.certificate_authorities);
    }
    if (proxy.certificate) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      newOutput.ssl.certificate = proxy.certificate;
    }
    if (proxy.certificate_key) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      newOutput.ssl.key = proxy.certificate_key;
    }
  }

  if (output.type === outputType.Elasticsearch && standalone) {
    // adding a place_holder as API_KEY
    newOutput.api_key = '${API_KEY}';
  }

  if (output.type === outputType.RemoteElasticsearch) {
    newOutput.service_token = output.service_token;
    newOutput.sync_integrations = output.sync_integrations;
    newOutput.sync_uninstalled_integrations = output.sync_uninstalled_integrations;
  }

  if (outputTypeSupportPresets(output.type)) {
    newOutput.preset = preset ?? getDefaultPresetForEsOutput(config_yaml ?? '', load);
  }

  return newOutput;
}

// Generate the SSL configs for fleet server connection to ES
// Corresponding to --fleet-server-es-ca, --fleet-server-es-cert, --fleet-server-es-cert-key cli options
// This function generates a `bootstrap output` to be sent directly to elastic-agent
export function generateFleetServerOutputSSLConfig(fleetServerHost: FleetServerHost | undefined):
  | {
      [key: string]: FullAgentPolicyOutput;
    }
  | undefined {
  if (!fleetServerHost || (!fleetServerHost?.ssl && !fleetServerHost.secrets)) return undefined;

  const outputConfig: FullAgentPolicyOutput = { type: 'elasticsearch' };
  if (fleetServerHost?.ssl) {
    outputConfig.ssl = {
      ...(fleetServerHost.ssl.es_certificate_authorities && {
        certificate_authorities: fleetServerHost.ssl.es_certificate_authorities,
      }),
      ...(fleetServerHost.ssl.es_certificate && {
        certificate: fleetServerHost.ssl.es_certificate,
      }),
      ...(fleetServerHost.ssl.es_key &&
        !fleetServerHost?.secrets?.ssl?.es_key && {
          key: fleetServerHost.ssl.es_key,
        }),
    };
  }
  // if both ssl.es_key and secrets.ssl.es_key are present, prefer the secrets'
  if (fleetServerHost?.secrets?.ssl?.es_key) {
    outputConfig.secrets = {
      ssl: { key: fleetServerHost.secrets?.ssl?.es_key },
    };
  }

  return {
    [`fleetserver-output-${fleetServerHost?.id}`]: outputConfig,
  };
}

export function getFullMonitoringSettings(
  agentPolicy: Pick<
    AgentPolicy,
    | 'namespace'
    | 'monitoring_enabled'
    | 'keep_monitoring_alive'
    | 'monitoring_pprof_enabled'
    | 'monitoring_http'
    | 'monitoring_diagnostics'
  >,
  monitoringOutput: Pick<Output, 'id' | 'is_default' | 'type'>
): FullAgentPolicyMonitoring {
  // Set base beats monitoring settings
  const monitoring: FullAgentPolicyMonitoring = {
    enabled: Boolean(
      (agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.length > 0) ||
        agentPolicy.monitoring_http?.enabled ||
        agentPolicy.keep_monitoring_alive
    ),
    logs: false,
    metrics: false,
    traces: false,
  };

  // If the agent policy has monitoring enabled for at least one of "logs", "metrics", or "traces"
  // generate a monitoring config for the resulting compiled agent policy
  if (agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.length > 0) {
    monitoring.namespace = agentPolicy.namespace;
    monitoring.use_output = getOutputIdForAgentPolicy(monitoringOutput);
    monitoring.logs = agentPolicy.monitoring_enabled.includes(dataTypes.Logs);
    monitoring.metrics = agentPolicy.monitoring_enabled.includes(dataTypes.Metrics);
    monitoring.traces = agentPolicy.monitoring_enabled.includes(dataTypes.Traces);
  }

  if (agentPolicy.monitoring_pprof_enabled !== undefined) {
    monitoring.pprof = {
      enabled: agentPolicy.monitoring_pprof_enabled,
    };
  }

  // Conditionally set http monitoring settings
  if (agentPolicy.monitoring_http?.enabled) {
    monitoring.http = {
      enabled: agentPolicy.monitoring_http.enabled,
      ...(agentPolicy.monitoring_http.host && { host: agentPolicy.monitoring_http.host }),
      ...(agentPolicy.monitoring_http.port && { port: agentPolicy.monitoring_http.port }),
    };
  }

  // Conditionally set diagnostics monitoring settings
  if (agentPolicy.monitoring_diagnostics?.limit || agentPolicy.monitoring_diagnostics?.uploader) {
    monitoring.diagnostics = {};

    if (
      agentPolicy.monitoring_diagnostics.limit &&
      (agentPolicy.monitoring_diagnostics.limit.interval ||
        typeof agentPolicy.monitoring_diagnostics.limit.burst === 'number')
    ) {
      monitoring.diagnostics.limit = {
        ...(agentPolicy.monitoring_diagnostics.limit.interval && {
          interval: agentPolicy.monitoring_diagnostics.limit.interval,
        }),
        ...(typeof agentPolicy.monitoring_diagnostics.limit.burst === 'number' && {
          burst: agentPolicy.monitoring_diagnostics.limit.burst,
        }),
      };
    }

    if (
      agentPolicy.monitoring_diagnostics.uploader &&
      (typeof agentPolicy.monitoring_diagnostics.uploader.max_retries === 'number' ||
        agentPolicy.monitoring_diagnostics.uploader.init_dur ||
        agentPolicy.monitoring_diagnostics.uploader.max_dur)
    ) {
      monitoring.diagnostics.uploader = {
        ...(typeof agentPolicy.monitoring_diagnostics.uploader.max_retries === 'number' && {
          max_retries: agentPolicy.monitoring_diagnostics.uploader.max_retries,
        }),
        ...(agentPolicy.monitoring_diagnostics.uploader.init_dur && {
          init_dur: agentPolicy.monitoring_diagnostics.uploader.init_dur,
        }),
        ...(agentPolicy.monitoring_diagnostics.uploader.max_dur && {
          max_dur: agentPolicy.monitoring_diagnostics.uploader.max_dur,
        }),
      };
    }
  }

  return monitoring;
}

function buildShipperQueueData(shipper: ShipperOutput) {
  const {
    disk_queue_enabled,
    disk_queue_path,
    disk_queue_max_size,
    disk_queue_compression_enabled,
  } = shipper;
  if (!disk_queue_enabled) return {};

  return {
    shipper: {
      queue: {
        disk: {
          path: disk_queue_path,
          max_size: disk_queue_max_size,
          use_compression: disk_queue_compression_enabled,
        },
      },
    },
  };
}

export function getBinarySourceSettings(
  downloadSource: DownloadSource,
  downloadSourceProxy: FleetProxy | undefined
) {
  const config: FullAgentPolicyDownload = {
    sourceURI: downloadSource.host,
  };

  if (downloadSource?.ssl) {
    config.ssl = {
      ...(downloadSource.ssl?.certificate_authorities && {
        certificate_authorities: downloadSource.ssl.certificate_authorities,
      }),
      ...(downloadSource.ssl?.certificate && {
        certificate: downloadSource.ssl.certificate,
      }),
      ...(downloadSource.ssl?.key &&
        !downloadSource?.secrets?.ssl?.key && {
          key: downloadSource.ssl.key,
        }),
    };
  }

  if (downloadSource?.auth) {
    const authConfig: FullAgentPolicyDownload['auth'] = {};
    if (downloadSource.auth.username) {
      authConfig.username = downloadSource.auth.username;
    }
    if (
      downloadSource.auth.password &&
      typeof downloadSource?.secrets?.auth?.password !== 'object'
    ) {
      authConfig.password = downloadSource.auth.password;
    }
    if (downloadSource.auth.api_key && typeof downloadSource?.secrets?.auth?.api_key !== 'object') {
      authConfig.api_key = downloadSource.auth.api_key;
    }
    // Filter out empty headers (both key and value are empty)
    if (downloadSource.auth.headers && downloadSource.auth.headers.length > 0) {
      const filteredHeaders = downloadSource.auth.headers.filter(
        (header) => header.key !== '' || header.value !== ''
      );
      if (filteredHeaders.length > 0) {
        authConfig.headers = filteredHeaders;
      }
    }
    if (Object.keys(authConfig).length > 0) {
      config.auth = authConfig;
    }
  }

  if (downloadSource?.secrets) {
    const secretsConfig: FullAgentPolicyDownload['secrets'] = {};

    if (downloadSource.secrets?.ssl?.key) {
      secretsConfig.ssl = {
        key: downloadSource.secrets.ssl.key,
      };
    }

    if (downloadSource.secrets?.auth) {
      const authSecretsConfig: NonNullable<FullAgentPolicyDownload['secrets']>['auth'] = {};
      if (typeof downloadSource.secrets.auth.password === 'object') {
        authSecretsConfig.password = downloadSource.secrets.auth.password;
      }
      if (typeof downloadSource.secrets.auth.api_key === 'object') {
        authSecretsConfig.api_key = downloadSource.secrets.auth.api_key;
      }
      if (Object.keys(authSecretsConfig).length > 0) {
        secretsConfig.auth = authSecretsConfig;
      }
    }

    if (Object.keys(secretsConfig).length > 0) {
      config.secrets = secretsConfig;
    }
  }

  if (downloadSourceProxy) {
    if (downloadSourceProxy.url) {
      config.proxy_url = downloadSourceProxy.url;
    }
    if (downloadSourceProxy.proxy_headers) {
      config.proxy_headers = downloadSourceProxy.proxy_headers;
    }
    // if the proxy is configured, get the ssl settings from it
    config.ssl = {
      ...(downloadSourceProxy?.certificate_authorities && {
        certificate_authorities: [downloadSourceProxy.certificate_authorities],
      }),
      ...(downloadSourceProxy?.certificate && {
        certificate: downloadSourceProxy.certificate,
      }),
      ...(downloadSourceProxy?.certificate_key && {
        key: downloadSourceProxy?.certificate_key,
      }),
    };
  }

  return config;
}
