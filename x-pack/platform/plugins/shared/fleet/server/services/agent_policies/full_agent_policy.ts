/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

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
  FullAgentPolicyMonitoring,
  FullAgentPolicyOutputPermissions,
  PackageInfo,
} from '../../../common/types';
import { agentPolicyService } from '../agent_policy';
import {
  dataTypes,
  DEFAULT_OUTPUT,
  kafkaCompressionType,
  outputType,
} from '../../../common/constants';
import { getSettingsValuesForAgentPolicy } from '../form_settings';
import { getPackageInfo } from '../epm/packages';
import { pkgToPkgKey, splitPkgKey } from '../epm/registry';
import { appContextService } from '../app_context';

import { getOutputSecretReferences } from '../secrets';

import { getMonitoringPermissions } from './monitoring_permissions';
import { storedPackagePoliciesToAgentInputs } from '.';
import {
  storedPackagePoliciesToAgentPermissions,
  DEFAULT_CLUSTER_PERMISSIONS,
} from './package_policies_to_agent_permissions';
import { fetchRelatedSavedObjects } from './related_saved_objects';

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
  options?: { standalone?: boolean; agentPolicy?: AgentPolicy }
): Promise<FullAgentPolicy | null> {
  const standalone = options?.standalone ?? false;

  let agentPolicy: AgentPolicy | null;
  if (options?.agentPolicy?.package_policies) {
    agentPolicy = options.agentPolicy;
  } else {
    agentPolicy = await fetchAgentPolicy(soClient, id);
  }

  if (!agentPolicy) {
    return null;
  }

  const {
    outputs,
    proxies,
    dataOutput,
    fleetServerHosts,
    monitoringOutput,
    downloadSourceUri,
    downloadSourceProxyUri,
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

  const inputs = (
    await storedPackagePoliciesToAgentInputs(
      agentPolicy.package_policies as PackagePolicy[],
      packageInfoCache,
      getOutputIdForAgentPolicy(dataOutput),
      agentPolicy.namespace,
      agentPolicy.global_data_tags
    )
  ).map((input) => {
    // fix output id for default output
    const output = outputs.find(({ id: outputId }) => input.use_output === outputId);
    if (output) {
      input.use_output = getOutputIdForAgentPolicy(output);
    }

    return input;
  });
  const features = (agentPolicy.agent_features || []).reduce((acc, { name, ...featureConfig }) => {
    acc[name] = featureConfig;
    return acc;
  }, {} as NonNullable<FullAgentPolicy['agent']>['features']);

  const outputSecretReferences = outputs.flatMap((output) => getOutputSecretReferences(output));
  const packagePolicySecretReferences = (agentPolicy?.package_policies || []).flatMap(
    (policy) => policy.secret_references || []
  );

  const fullAgentPolicy: FullAgentPolicy = {
    id: agentPolicy.id,
    outputs: {
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
    secret_references: [...outputSecretReferences, ...packagePolicySecretReferences],
    revision: agentPolicy.revision,
    agent: {
      download: {
        sourceURI: downloadSourceUri,
        ...(downloadSourceProxyUri ? { proxy_url: downloadSourceProxyUri } : {}),
      },
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
    const dataPermissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      agentPolicy.namespace,
      packagePolicies
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

      outputPermissions[outputId] = permissions;
    }
    return outputPermissions;
  }, {});

  // only add fleet server hosts if not in standalone
  if (!standalone && fleetServerHosts) {
    fullAgentPolicy.fleet = generateFleetConfig(fleetServerHosts, proxies);
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
  if (messageSigningService && fullAgentPolicy.agent) {
    const publicKey = await messageSigningService.getPublicKey();
    const tokenHash =
      (await appContextService
        .getUninstallTokenService()
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
  }

  if (agentPolicy.overrides) {
    return deepMerge<FullAgentPolicy>(fullAgentPolicy, agentPolicy.overrides);
  }

  return fullAgentPolicy;
}

export function generateFleetConfig(
  fleetServerHosts: FleetServerHost,
  proxies: FleetProxy[]
): FullAgentPolicy['fleet'] {
  const config: FullAgentPolicy['fleet'] = {
    hosts: fleetServerHosts.host_urls,
  };
  const fleetServerHostproxy = fleetServerHosts.proxy_id
    ? proxies.find((proxy) => proxy.id === fleetServerHosts.proxy_id)
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

    /* eslint-enable @typescript-eslint/naming-convention */
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
    /* eslint-disable @typescript-eslint/naming-convention */
    const {
      loadbalance,
      compression_level,
      queue_flush_timeout,
      max_batch_bytes,
      mem_queue_events,
    } = shipper;
    /* eslint-enable @typescript-eslint/naming-convention */

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
    ...(ssl ? { ssl } : {}),
    ...(secrets ? { secrets } : {}),
    ...(ca_trusted_fingerprint ? { 'ssl.ca_trusted_fingerprint': ca_trusted_fingerprint } : {}),
  };

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
    newOutput.kibana_api_key = output.kibana_api_key;
    newOutput.kibana_url = output.kibana_url;
    newOutput.sync_integrations = output.sync_integrations;
  }

  if (outputTypeSupportPresets(output.type)) {
    newOutput.preset = preset ?? getDefaultPresetForEsOutput(config_yaml ?? '', load);
  }

  return newOutput;
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

/**
 * Get id used in full agent policy (sent to the agents)
 * we use "default" for the default policy to avoid breaking changes
 */
function getOutputIdForAgentPolicy(output: Pick<Output, 'id' | 'is_default' | 'type'>) {
  if (output.is_default && output.type === outputType.Elasticsearch) {
    return DEFAULT_OUTPUT.name;
  }
  return output.id;
}

/* eslint-disable @typescript-eslint/naming-convention */
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
/* eslint-enable @typescript-eslint/naming-convention */
