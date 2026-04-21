/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityIndicesPrivileges,
  SecurityRoleDescriptor,
} from '@elastic/elasticsearch/lib/api/types';

import {
  FLEET_APM_PACKAGE,
  FLEET_CONNECTORS_PACKAGE,
  FLEET_UNIVERSAL_PROFILING_COLLECTOR_PACKAGE,
  FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE,
  OTEL_COLLECTOR_INPUT_TYPE,
  USE_APM_VAR_NAME,
} from '../../../common/constants';

import { getNormalizedDataStreams } from '../../../common/services';

import type {
  FullAgentPolicyOutputPermissions,
  PackageInfo,
  RegistryDataStreamPrivileges,
} from '../../../common/types';
import { PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES } from '../../constants';
import { PackagePolicyRequestError, PackagePolicyValidationError } from '../../errors';

import type { FullAgentPolicyInput, PackagePolicy, TemplateAgentPolicyInput } from '../../types';
import { pkgToPkgKey } from '../epm/registry';
import { packagePolicyInputAllowsUndefinedDataStreamType } from '../../../common/services';

import { extractSignalTypesFromPipelines } from './otel_collector';
import { getEffectiveOtelStreamDataset } from './get_effective_otel_stream_dataset';

export const DEFAULT_CLUSTER_PERMISSIONS = ['monitor'];

export const UNIVERSAL_PROFILING_PERMISSIONS = [
  'auto_configure',
  'read',
  'create_doc',
  'create',
  'write',
  'index',
  'view_index_metadata',
];

export const ELASTIC_CONNECTORS_INDEX_PERMISSIONS = [
  'read',
  'write',
  'monitor',
  'create_index',
  'auto_configure',
  'maintenance',
  'view_index_metadata',
];

export const AGENTLESS_INDEX_PERMISSIONS = [
  'read',
  'write',
  'monitor',
  'create_index',
  'auto_configure',
  'maintenance',
  'view_index_metadata',
];

export function storedPackagePoliciesToAgentPermissions(
  packageInfoCache: Map<string, PackageInfo>,
  agentPolicyNamespace: string,
  packagePolicies?: PackagePolicy[],
  agentInputs?: FullAgentPolicyInput[] | TemplateAgentPolicyInput[]
): FullAgentPolicyOutputPermissions | undefined {
  // I'm not sure what permissions to return for this case, so let's return the defaults
  if (!packagePolicies) {
    throw new PackagePolicyRequestError(
      'storedPackagePoliciesToAgentPermissions should be called with a PackagePolicy'
    );
  }

  if (packagePolicies.length === 0) {
    return;
  }

  const permissionEntries = packagePolicies.map((packagePolicy) => {
    if (!packagePolicy.package) {
      throw new PackagePolicyRequestError(
        `No package for package policy ${packagePolicy.name ?? packagePolicy.id}`
      );
    }

    const pkg = packageInfoCache.get(pkgToPkgKey(packagePolicy.package));

    if (!pkg) {
      throw new PackagePolicyRequestError(
        `Package ${packagePolicy.package.name}:${packagePolicy.package.version} not found in cache for package policy ${packagePolicy.id}`
      );
    }

    // Special handling for Universal Profiling packages, as it does not use data streams _only_,
    // but also indices that do not adhere to the convention.
    if (
      pkg.name === FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE ||
      pkg.name === FLEET_UNIVERSAL_PROFILING_COLLECTOR_PACKAGE
    ) {
      return universalProfilingPermissions(packagePolicy.id);
    }

    if (pkg.name === FLEET_APM_PACKAGE) {
      return apmPermissions(packagePolicy.id);
    }

    if (pkg.name === FLEET_CONNECTORS_PACKAGE) {
      return connectorServicePermissions(packagePolicy.id);
    }

    // If any enabled input in this package policy has dynamic_signal_types, permissions are
    // determined dynamically from OTel pipelines rather than from static data stream definitions.
    // We check per-input (not package-level) so that a non-dynamic input in a package that also
    // has a dynamic input template gets normal data-stream-based permissions.
    const isDynamicInput = packagePolicy.inputs.some(
      (input) => input.enabled && packagePolicyInputAllowsUndefinedDataStreamType(pkg, input)
    );

    const dataStreams = getNormalizedDataStreams(pkg);
    if (!isDynamicInput && (!dataStreams || dataStreams.length === 0)) {
      // Return empty object (not undefined) if no additional permissions
      return [packagePolicy.id, maybeAddAdditionalPackagePoliciesPermissions(packagePolicy) ?? {}];
    }

    let dataStreamsForPermissions: DataStreamMeta[];

    switch (pkg.name) {
      case 'endpoint':
        // - Endpoint doesn't store the `data_stream` metadata in
        // `packagePolicy.inputs`, so we will use _all_ data_streams from the
        // package.
        dataStreamsForPermissions = dataStreams;
        break;

      case 'apm':
        // - APM doesn't store the `data_stream` metadata in
        //   `packagePolicy.inputs`, so we will use _all_ data_streams from
        //   the package.
        dataStreamsForPermissions = dataStreams;
        break;

      case 'osquery_manager':
        // - Osquery manager doesn't store the `data_stream` metadata in
        //   `packagePolicy.inputs`, so we will use _all_ data_streams from
        //   the package.
        dataStreamsForPermissions = dataStreams;
        break;

      default:
        // - Packages with dynamic_signal_types (input-only or composable integration) produce data
        //   for signal types defined in OTel pipelines; grant index permissions per signal type
        //   pattern (e.g., logs-*-*, metrics-*-*) derived from agentInputs pipelines.
        if (isDynamicInput) {
          const otelcolPipelines = agentInputs?.find((i) => i.type === OTEL_COLLECTOR_INPUT_TYPE)
            ?.streams?.[0]?.service?.pipelines;

          let signalTypes: string[];
          if (otelcolPipelines) {
            // Use pipelines if available
            signalTypes = extractSignalTypesFromPipelines(otelcolPipelines);
          } else {
            // If no pipelines found, return empty array
            signalTypes = [];
          }

          const baseMeta: DataStreamMeta = {
            type: 'logs',
            dataset: '',
            elasticsearch: { dynamic_dataset: true, dynamic_namespace: true },
          };
          dataStreamsForPermissions = signalTypes.map((type) => ({
            ...baseMeta,
            type,
          }));
        } else {
          // - Normal packages store some of the `data_stream` metadata in
          //   `packagePolicy.inputs[].streams[].data_stream`
          // - The rest of the metadata needs to be fetched from the
          //   `data_stream` object in the package. The link is
          //   `packagePolicy.inputs[].type == dataStreams.streams[].input`
          // - Some packages (custom logs) have a compiled dataset, stored in
          //   `input.streams.compiled_stream.data_stream.dataset`
          dataStreamsForPermissions = packagePolicy.inputs
            .filter((i) => i.enabled)
            .flatMap((input) => {
              if (!input.streams) {
                return [];
              }

              const dataStreams_: DataStreamMeta[] = [];
              const isOtelInput = input.type === OTEL_COLLECTOR_INPUT_TYPE;
              const inputAllowsDynamic = packagePolicyInputAllowsUndefinedDataStreamType(
                pkg,
                input
              );
              input.streams
                .filter((s) => s.enabled)
                .forEach((stream) => {
                  if (!('data_stream' in stream)) {
                    return;
                  }

                  if (!stream.data_stream.type) {
                    if (inputAllowsDynamic) {
                      // Dynamic signal types input — type is resolved at runtime, skip
                      return;
                    }
                    // Should never happen for non-dynamic inputs if preflightCheckPackagePolicy ran
                    throw new PackagePolicyValidationError(
                      `[data_stream.type]: unexpected undefined stream type for non-dynamic package "${pkg.name}"`
                    );
                  }

                  const ds: DataStreamMeta = {
                    type: stream.data_stream.type,
                    dataset: isOtelInput
                      ? getEffectiveOtelStreamDataset(stream)
                      : stream.compiled_stream?.data_stream?.dataset ?? stream.data_stream.dataset,
                  };

                  if (stream.data_stream.elasticsearch) {
                    ds.elasticsearch = stream.data_stream.elasticsearch;
                  }

                  dataStreams_.push(ds);

                  if (isOtelInput && stream.data_stream.type === 'traces') {
                    // Span events use the same effective dataset as OTTL (getFullInputStreams merge +
                    // data_stream.dataset var, then generateOtelTypeTransforms). Propagate
                    // dynamic_dataset from the traces stream so wildcard indices match traces-*-* when
                    // the registry marks traces as dynamic (input-type OTel packages).
                    const spanEventElasticsearch = getOtelSpanEventElasticsearchFromTracesStream(
                      stream.data_stream.elasticsearch
                    );
                    dataStreams_.push({
                      type: 'logs',
                      dataset: getEffectiveOtelStreamDataset(stream),
                      ...(spanEventElasticsearch ? { elasticsearch: spanEventElasticsearch } : {}),
                    });

                    if (stream.vars?.[USE_APM_VAR_NAME]?.value === true) {
                      dataStreams_.push({
                        type: 'metrics',
                        dataset: 'generic',
                        elasticsearch: {
                          dynamic_dataset: true,
                          dynamic_namespace: true,
                        },
                      });
                    }
                  }
                });

              return dataStreams_;
            });
        }
    }

    let clusterRoleDescriptor = {};
    const cluster = packagePolicy?.elasticsearch?.privileges?.cluster ?? [];
    if (cluster.length > 0) {
      clusterRoleDescriptor = {
        cluster,
      };
    }
    // namespace is either the package policy's or the agent policy one
    const namespace = packagePolicy?.namespace || agentPolicyNamespace;

    return [
      packagePolicy.id,
      maybeAddAdditionalPackagePoliciesPermissions(
        packagePolicy,
        maybeAddAgentlessPermissions(packagePolicy, {
          indices: dataStreamsForPermissions.map((ds) => getDataStreamPrivileges(ds, namespace)),
          ...clusterRoleDescriptor,
        })
      ),
    ];
  });

  return Object.fromEntries(permissionEntries);
}

export interface DataStreamMeta {
  type: string;
  dataset: string;
  dataset_is_prefix?: boolean;
  hidden?: boolean;
  elasticsearch?: {
    privileges?: RegistryDataStreamPrivileges;
    dynamic_namespace?: boolean;
    dynamic_dataset?: boolean;
  };
}

/** Span-event logs inherit only dynamic_dataset/dynamic_namespace from the traces stream; omit when unset. */
function getOtelSpanEventElasticsearchFromTracesStream(
  traceElasticsearch: DataStreamMeta['elasticsearch'] | undefined
):
  | Pick<NonNullable<DataStreamMeta['elasticsearch']>, 'dynamic_dataset' | 'dynamic_namespace'>
  | undefined {
  if (!traceElasticsearch) {
    return undefined;
  }
  const { dynamic_dataset, dynamic_namespace } = traceElasticsearch;
  if (dynamic_dataset === undefined && dynamic_namespace === undefined) {
    return undefined;
  }
  return {
    ...(dynamic_dataset !== undefined ? { dynamic_dataset } : {}),
    ...(dynamic_namespace !== undefined ? { dynamic_namespace } : {}),
  };
}

export function getDataStreamPrivileges(
  dataStream: DataStreamMeta,
  namespace: string = '*'
): SecurityIndicesPrivileges {
  let index = dataStream.hidden ? `.${dataStream.type}-` : `${dataStream.type}-`;

  // Determine dataset
  if (dataStream.elasticsearch?.dynamic_dataset) {
    index += `*`;
  } else if (dataStream.dataset_is_prefix) {
    index += `${dataStream.dataset}.*`;
  } else {
    index += dataStream.dataset;
  }

  // Determine namespace
  if (dataStream.elasticsearch?.dynamic_namespace) {
    index += `-*`;
  } else {
    index += `-${namespace}`;
  }

  const privileges = dataStream?.elasticsearch?.privileges?.indices?.length
    ? dataStream.elasticsearch.privileges.indices
    : PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES;

  return {
    names: [index],
    privileges,
  };
}

function universalProfilingPermissions(packagePolicyId: string): [string, SecurityRoleDescriptor] {
  const profilingIndexPattern = 'profiling-*';
  return [
    packagePolicyId,
    {
      indices: [
        {
          names: [profilingIndexPattern],
          privileges: UNIVERSAL_PROFILING_PERMISSIONS,
        },
      ],
    },
  ];
}

function maybeAddAgentlessPermissions(
  packagePolicy: PackagePolicy,
  existing: SecurityRoleDescriptor
): SecurityRoleDescriptor {
  if (!packagePolicy.supports_agentless) {
    return existing;
  }
  existing.indices!.push({
    names: ['agentless-*'],
    privileges: AGENTLESS_INDEX_PERMISSIONS,
  });
  return existing;
}

function maybeAddAdditionalPackagePoliciesPermissions(
  packagePolicy: PackagePolicy,
  existing?: SecurityRoleDescriptor
): SecurityRoleDescriptor | undefined {
  if (
    !packagePolicy.additional_datastreams_permissions ||
    !packagePolicy.additional_datastreams_permissions.length
  ) {
    return existing;
  }

  if (!existing) {
    existing = {};
  }

  if (!existing.indices) {
    existing.indices = [];
  }

  existing.indices!.push({
    names: packagePolicy.additional_datastreams_permissions,
    privileges: PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES,
  });
  return existing;
}

function apmPermissions(packagePolicyId: string): [string, SecurityRoleDescriptor] {
  return [
    packagePolicyId,
    {
      cluster: ['cluster:monitor/main'],
      indices: [
        {
          names: ['traces-*', 'logs-*', 'metrics-*'],
          privileges: ['auto_configure', 'create_doc'],
        },
        {
          names: ['traces-apm.sampled-*'],
          privileges: ['auto_configure', 'create_doc', 'maintenance', 'monitor', 'read'],
        },
      ],
    },
  ];
}

function connectorServicePermissions(packagePolicyId: string): [string, SecurityRoleDescriptor] {
  return [
    packagePolicyId,
    {
      cluster: ['manage_connector'],
      indices: [
        {
          names: ['.elastic-connectors*'],
          privileges: ELASTIC_CONNECTORS_INDEX_PERMISSIONS,
        },
        {
          names: ['content-*', '.search-acl-filter-*'],
          privileges: ELASTIC_CONNECTORS_INDEX_PERMISSIONS,
        },
        {
          names: ['logs-elastic_agent*'],
          privileges: ['auto_configure', 'create_doc'],
        },
      ],
    },
  ];
}
