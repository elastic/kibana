/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

import { isValidExperimentalValue } from '../common/experimental_features';

import {
  PreconfiguredPackagesSchema,
  PreconfiguredAgentPoliciesSchema,
  PreconfiguredOutputsSchema,
  PreconfiguredFleetServerHostsSchema,
  PreconfiguredFleetProxiesSchema,
  PreconfiguredSpaceSettingsSchema,
} from './types';
import { BULK_CREATE_MAX_ARTIFACTS_BYTES } from './services/artifacts/artifacts';

const DEFAULT_BUNDLED_PACKAGE_LOCATION = path.join(__dirname, '../target/bundled_packages');
const DEFAULT_GPG_KEY_PATH = path.join(__dirname, '../target/keys/GPG-KEY-elasticsearch');

const REGISTRY_SPEC_MAX_VERSION = '3.3';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: {
      enabled: true,
    },
    agentless: {
      enabled: true,
    },
    enableExperimental: true,
    developer: {
      maxAgentPoliciesWithInactivityTimeout: true,
    },
    internal: {
      fleetServerStandalone: true,
      activeAgentsSoftLimit: true,
      onlyAllowAgentUpgradeToKnownVersions: true,
    },
  },
  deprecations: ({ renameFromRoot, unused, unusedFromRoot }) => [
    // Unused settings before Fleet server exists
    unused('agents.kibana', { level: 'critical' }),
    unused('agents.maxConcurrentConnections', { level: 'critical' }),
    unused('agents.agentPolicyRolloutRateLimitIntervalMs', { level: 'critical' }),
    unused('agents.agentPolicyRolloutRateLimitRequestPerInterval', { level: 'critical' }),
    unused('agents.pollingRequestTimeout', { level: 'critical' }),
    unused('agents.tlsCheckDisabled', { level: 'critical' }),
    unused('agents.fleetServerEnabled', { level: 'critical' }),
    // Deprecate default policy flags
    (fullConfig, fromPath, addDeprecation) => {
      if (
        (fullConfig?.xpack?.fleet?.agentPolicies || []).find((policy: any) => policy.is_default)
      ) {
        addDeprecation({
          configPath: 'xpack.fleet.agentPolicies.is_default',
          message: `Config key [xpack.fleet.agentPolicies.is_default] is deprecated.`,
          correctiveActions: {
            manualSteps: [`Create a dedicated policy instead through the UI or API.`],
          },
          level: 'warning',
        });
      }
      return fullConfig;
    },
    (fullConfig, fromPath, addDeprecation) => {
      if (
        (fullConfig?.xpack?.fleet?.agentPolicies || []).find(
          (policy: any) => policy.is_default_fleet_server
        )
      ) {
        addDeprecation({
          configPath: 'xpack.fleet.agentPolicies.is_default_fleet_server',
          message: `Config key [xpack.fleet.agentPolicies.is_default_fleet_server] is deprecated.`,
          correctiveActions: {
            manualSteps: [`Create a dedicated fleet server policy instead through the UI or API.`],
          },
          level: 'warning',
        });
      }
      return fullConfig;
    },
    // Renaming elasticsearch.host => elasticsearch.hosts
    (fullConfig, fromPath, addDeprecation) => {
      const oldValue = fullConfig?.xpack?.fleet?.agents?.elasticsearch?.host;
      if (oldValue) {
        delete fullConfig.xpack.fleet.agents.elasticsearch.host;
        fullConfig.xpack.fleet.agents.elasticsearch.hosts = [oldValue];
        addDeprecation({
          configPath: 'xpack.fleet.agents.elasticsearch.host',
          message: `Config key [xpack.fleet.agents.elasticsearch.host] is deprecated and replaced by [xpack.fleet.agents.elasticsearch.hosts]`,
          correctiveActions: {
            manualSteps: [
              `Use [xpack.fleet.agents.elasticsearch.hosts] with an array of host instead.`,
            ],
          },
          level: 'critical',
        });
      }

      return fullConfig;
    },
    // Log invalid experimental values
    (fullConfig, fromPath, addDeprecation) => {
      for (const key of fullConfig?.xpack?.fleet?.enableExperimental ?? []) {
        if (!isValidExperimentalValue(key)) {
          addDeprecation({
            configPath: 'xpack.fleet.fleet.enableExperimental',
            message: `[${key}] is not a valid fleet experimental feature [xpack.fleet.fleet.enableExperimental].`,
            correctiveActions: {
              manualSteps: [
                `Use [xpack.fleet.fleet.enableExperimental] with an array of valid experimental features.`,
              ],
            },
            level: 'warning',
          });
        }
      }
    },
  ],
  schema: schema.object(
    {
      isAirGapped: schema.maybe(schema.boolean({ defaultValue: false })),
      enableDeleteUnenrolledAgents: schema.maybe(schema.boolean({ defaultValue: false })),
      enableManagedLogsAndMetricsDataviews: schema.boolean({ defaultValue: true }),
      registryUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
      registryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
      agents: schema.object({
        enabled: schema.boolean({ defaultValue: true }),
        elasticsearch: schema.object({
          hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
          ca_sha256: schema.maybe(schema.string()),
          ca_trusted_fingerprint: schema.maybe(schema.string()),
        }),
        fleet_server: schema.maybe(
          schema.object({
            hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
          })
        ),
      }),
      agentless: schema.maybe(
        schema.object({
          enabled: schema.boolean({ defaultValue: false }),
          api: schema.maybe(
            schema.object({
              url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
              tls: schema.maybe(
                schema.object({
                  certificate: schema.maybe(schema.string()),
                  key: schema.maybe(schema.string()),
                  ca: schema.maybe(schema.string()),
                })
              ),
            })
          ),
        })
      ),
      packages: PreconfiguredPackagesSchema,
      agentPolicies: PreconfiguredAgentPoliciesSchema,
      outputs: PreconfiguredOutputsSchema,
      fleetServerHosts: PreconfiguredFleetServerHostsSchema,
      proxies: PreconfiguredFleetProxiesSchema,
      spaceSettings: PreconfiguredSpaceSettingsSchema,
      agentIdVerificationEnabled: schema.boolean({ defaultValue: true }),
      eventIngestedEnabled: schema.boolean({ defaultValue: false }),
      setup: schema.maybe(
        schema.object({
          agentPolicySchemaUpgradeBatchSize: schema.maybe(schema.number()),
          uninstallTokenVerificationBatchSize: schema.maybe(schema.number()),
        })
      ),
      developer: schema.object({
        maxAgentPoliciesWithInactivityTimeout: schema.maybe(schema.number()),
        disableRegistryVersionCheck: schema.boolean({ defaultValue: false }),
        allowAgentUpgradeSourceUri: schema.boolean({ defaultValue: false }),
        bundledPackageLocation: schema.string({ defaultValue: DEFAULT_BUNDLED_PACKAGE_LOCATION }),
        disableBundledPackagesCache: schema.boolean({
          defaultValue: false,
        }),
      }),
      packageVerification: schema.object({
        gpgKeyPath: schema.string({ defaultValue: DEFAULT_GPG_KEY_PATH }),
      }),
      /**
       * For internal use. A list of string values (comma delimited) that will enable experimental
       * type of functionality that is not yet released.
       *
       * @example
       * xpack.fleet.enableExperimental:
       *   - feature1
       *   - feature2
       */
      enableExperimental: schema.arrayOf(schema.string(), {
        defaultValue: () => [],
      }),

      internal: schema.object({
        useMeteringApi: schema.boolean({
          defaultValue: false,
        }),
        disableILMPolicies: schema.boolean({
          defaultValue: false,
        }),
        fleetServerStandalone: schema.boolean({
          defaultValue: false,
        }),
        onlyAllowAgentUpgradeToKnownVersions: schema.boolean({
          defaultValue: false,
        }),
        activeAgentsSoftLimit: schema.maybe(
          schema.number({
            min: 0,
          })
        ),
        retrySetupOnBoot: schema.boolean({ defaultValue: false }),
        registry: schema.object(
          {
            kibanaVersionCheckEnabled: schema.boolean({ defaultValue: true }),
            excludePackages: schema.arrayOf(schema.string(), { defaultValue: [] }),
            spec: schema.object(
              {
                min: schema.maybe(schema.string()),
                max: schema.string({ defaultValue: REGISTRY_SPEC_MAX_VERSION }),
              },
              {
                defaultValue: {
                  max: REGISTRY_SPEC_MAX_VERSION,
                },
              }
            ),
            capabilities: schema.arrayOf(
              schema.oneOf([
                // See package-spec for the list of available capiblities https://github.com/elastic/package-spec/blob/dcc37b652690f8a2bca9cf8a12fc28fd015730a0/spec/integration/manifest.spec.yml#L113
                schema.literal('apm'),
                schema.literal('enterprise_search'),
                schema.literal('observability'),
                schema.literal('security'),
                schema.literal('serverless_search'),
                schema.literal('uptime'),
              ]),
              { defaultValue: [] }
            ),
          },
          {
            defaultValue: {
              kibanaVersionCheckEnabled: true,
              capabilities: [],
              excludePackages: [],
              spec: {
                max: REGISTRY_SPEC_MAX_VERSION,
              },
            },
          }
        ),
      }),
      enabled: schema.boolean({ defaultValue: true }),
      /**
       * The max size of the artifacts encoded_size sum in a batch when more than one (there is at least one artifact in a batch).
       * @example
       * artifact1.encoded_size = 400
       * artifact2.encoded_size = 600
       * artifact3.encoded_size = 1_200
       * and
       * createArtifactsBulkBatchSize: 1_000
       * then
       * batch1 = [artifact1, artifact2]
       * batch2 = [artifact3]
       */
      createArtifactsBulkBatchSize: schema.maybe(
        schema.number({
          defaultValue: BULK_CREATE_MAX_ARTIFACTS_BYTES,
          max: 4_000_000,
          min: 400,
        })
      ),
    },
    {
      validate: (configToValidate) => {
        const hasDefaultPreconfiguredOuputs = configToValidate.outputs.some(
          (o) => o.is_default || o.is_default_monitoring
        );
        const hasDefaulElasticsearchOutputDefined =
          configToValidate.agents?.elasticsearch?.hosts?.length ?? 0 > 0;

        if (hasDefaulElasticsearchOutputDefined && hasDefaultPreconfiguredOuputs) {
          return 'xpack.fleet.agents.elasticsearch.hosts should not be used when defining default outputs in xpack.fleet.outputs, please remove it.';
        }
      },
    }
  ),
};

export type FleetConfigType = TypeOf<typeof config.schema>;
