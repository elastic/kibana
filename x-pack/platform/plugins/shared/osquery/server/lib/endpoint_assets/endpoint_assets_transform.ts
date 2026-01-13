/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  OSQUERY_INTEGRATION_NAME,
  ENDPOINT_ASSETS_TRANSFORM_PREFIX,
  ENDPOINT_ASSETS_PIPELINE_PREFIX,
  ENDPOINT_ASSETS_INDEX_PREFIX,
  ENDPOINT_ASSETS_TRANSFORM_FREQUENCY,
  ENDPOINT_ASSETS_TRANSFORM_DELAY,
  ENDPOINT_ASSETS_ENTITY_SUB_TYPE,
  ENDPOINT_ASSETS_ENTITY_SOURCE,
} from '../../../common/constants';

/**
 * Get the transform ID for the given namespace
 */
export const getEndpointAssetsTransformId = (namespace: string): string =>
  `${ENDPOINT_ASSETS_TRANSFORM_PREFIX}${namespace}`;

/**
 * Get the destination index name for the given namespace
 */
export const getEndpointAssetsIndexName = (namespace: string): string =>
  `${ENDPOINT_ASSETS_INDEX_PREFIX}-${namespace}`;

/**
 * Get the ingest pipeline ID for the given namespace
 */
export const getEndpointAssetsPipelineId = (namespace: string): string =>
  `${ENDPOINT_ASSETS_PIPELINE_PREFIX}${namespace}`;

/**
 * Transform configuration for aggregating osquery results into per-asset documents.
 *
 * This transform:
 * - Reads from logs-osquery_manager.result-* (osquery results)
 * - Groups by host.id to create one document per asset
 * - Uses top_metrics to get the latest values for each field
 * - Aggregates security-relevant counts for CAASM visibility
 * - Outputs to endpoint-assets-osquery-{namespace}
 *
 * Schema is designed to be compatible with Entity Store for future integration.
 */
export const getEndpointAssetsTransformConfig = (
  namespace: string
): TransformPutTransformRequest => ({
  transform_id: getEndpointAssetsTransformId(namespace),
  description:
    'Aggregates osquery results into endpoint asset documents for CAASM visibility. Schema compatible with Entity Store.',
  source: {
    index: [`logs-${OSQUERY_INTEGRATION_NAME}.result-${namespace}`],
    query: {
      bool: {
        filter: [
          {
            exists: {
              field: 'host.id',
            },
          },
        ],
      },
    },
  },
  dest: {
    index: getEndpointAssetsIndexName(namespace),
    pipeline: getEndpointAssetsPipelineId(namespace),
  },
  pivot: {
    group_by: {
      'entity.id': {
        terms: {
          field: 'host.id',
        },
      },
      'entity.name': {
        terms: {
          field: 'host.name',
        },
      },
    },
    aggregations: {
      // Asset platform
      tmp_asset_platform: {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Host fields
      tmp_host_id: {
        top_metrics: {
          metrics: [{ field: 'host.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_name: {
        top_metrics: {
          metrics: [{ field: 'host.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_hostname: {
        top_metrics: {
          metrics: [{ field: 'host.hostname' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_name: {
        top_metrics: {
          metrics: [{ field: 'host.os.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_version: {
        top_metrics: {
          metrics: [{ field: 'host.os.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_platform: {
        top_metrics: {
          metrics: [{ field: 'host.os.platform' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_family: {
        top_metrics: {
          metrics: [{ field: 'host.os.family' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_build: {
        top_metrics: {
          metrics: [{ field: 'host.os.build' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_os_kernel: {
        top_metrics: {
          metrics: [{ field: 'host.os.kernel' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_architecture: {
        top_metrics: {
          metrics: [{ field: 'host.architecture' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_ip: {
        top_metrics: {
          metrics: [{ field: 'host.ip' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_host_mac: {
        top_metrics: {
          metrics: [{ field: 'host.mac' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Agent fields
      tmp_agent_id: {
        top_metrics: {
          metrics: [{ field: 'agent.id' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_name: {
        top_metrics: {
          metrics: [{ field: 'agent.name' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_type: {
        top_metrics: {
          metrics: [{ field: 'agent.type' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_agent_version: {
        top_metrics: {
          metrics: [{ field: 'agent.version' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Lifecycle fields
      'endpoint.lifecycle.first_seen': {
        min: {
          field: '@timestamp',
        },
      },
      'endpoint.lifecycle.last_seen': {
        max: {
          field: '@timestamp',
        },
      },

      // Document timestamp
      '@timestamp': {
        max: {
          field: '@timestamp',
        },
      },

      // Query metadata
      'endpoint.queries.total_results': {
        value_count: {
          field: '@timestamp',
        },
      },

      // Privileges - local admins
      'endpoint.privileges.local_admins': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.user' } },
              { exists: { field: 'osquery.groupname' } },
            ],
            should: [
              { term: { 'osquery.groupname': 'Administrators' } },
              { term: { 'osquery.groupname': 'admin' } },
              { term: { 'osquery.groupname': 'sudo' } },
              { term: { 'osquery.groupname': 'wheel' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          admins_list: {
            terms: {
              field: 'osquery.user',
              size: 100,
            },
          },
        },
      },

      // Privileges - admin count
      'endpoint.privileges.admin_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.user' } },
              { exists: { field: 'osquery.groupname' } },
            ],
            should: [
              { term: { 'osquery.groupname': 'Administrators' } },
              { term: { 'osquery.groupname': 'admin' } },
              { term: { 'osquery.groupname': 'sudo' } },
              { term: { 'osquery.groupname': 'wheel' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.user',
            },
          },
        },
      },

      // Hardware - CPU info
      tmp_hardware_cpu: {
        top_metrics: {
          metrics: [{ field: 'osquery.cpu_brand' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_hardware_cpu_cores: {
        top_metrics: {
          metrics: [{ field: 'osquery.cpu_physical_cores' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_hardware_memory_gb: {
        top_metrics: {
          metrics: [{ field: 'osquery.physical_memory' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_hardware_vendor: {
        top_metrics: {
          metrics: [{ field: 'osquery.hardware_vendor' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_hardware_model: {
        top_metrics: {
          metrics: [{ field: 'osquery.hardware_model' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Network - listening ports count
      'endpoint.network.listening_ports_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.port' } },
              { term: { 'osquery.state': 'LISTEN' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.port',
            },
          },
        },
      },

      // Software counts
      'endpoint.software.installed_count': {
        filter: { exists: { field: 'osquery.version' } },
        aggs: {
          count: { cardinality: { field: 'osquery.name' } },
        },
      },
      'endpoint.software.services_count': {
        filter: { exists: { field: 'osquery.service_name' } },
        aggs: {
          count: { cardinality: { field: 'osquery.service_name' } },
        },
      },

      // Posture - disk encryption
      'endpoint.posture.disk_encryption_raw': {
        filter: { exists: { field: 'osquery.encrypted' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.encrypted' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - firewall
      'endpoint.posture.firewall_enabled_raw': {
        filter: {
          bool: {
            should: [
              { exists: { field: 'osquery.firewall_enabled' } },
              { exists: { field: 'osquery.global_state' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [
                { field: 'osquery.firewall_enabled' },
                { field: 'osquery.global_state' },
              ],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - secure boot
      'endpoint.posture.secure_boot_raw': {
        filter: { exists: { field: 'osquery.secure_boot' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.secure_boot' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - macOS SIP (System Integrity Protection)
      'endpoint.posture.sip_enabled_raw': {
        filter: { exists: { field: 'osquery.config_flag' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.config_flag' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Posture - macOS Gatekeeper
      'endpoint.posture.gatekeeper_enabled_raw': {
        filter: { exists: { field: 'osquery.assessments_enabled' } },
        aggs: {
          _value: {
            top_metrics: {
              metrics: [{ field: 'osquery.assessments_enabled' }],
              sort: [{ '@timestamp': 'desc' }],
            },
          },
        },
      },

      // Hardware - Disk capacity and free space
      // Uses top_metrics since osquery.disk_size is a keyword field
      tmp_disk_size: {
        top_metrics: {
          metrics: [{ field: 'osquery.disk_size' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },
      tmp_disk_free: {
        top_metrics: {
          metrics: [{ field: 'osquery.free_space' }],
          sort: [{ '@timestamp': 'desc' }],
        },
      },

      // Hardware - USB removable devices count
      'endpoint.hardware.usb_removable_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.vendor_id' } },
              { term: { 'osquery.removable': '1' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.vendor_id',
            },
          },
        },
      },

      // Software - Browser extensions
      'endpoint.software.browser_extensions_count': {
        filter: { exists: { field: 'osquery.identifier' } },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.identifier',
            },
          },
        },
      },
      'endpoint.software.chrome_extensions_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.identifier' } },
              { term: { 'osquery.browser_type': 'chrome' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.identifier',
            },
          },
        },
      },

      // Software - Startup items (Windows)
      'endpoint.software.startup_items_count': {
        filter: { exists: { field: 'osquery.path' } },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.path',
            },
          },
        },
      },

      // Software - Launch agents (macOS)
      'endpoint.software.launch_agents_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.program' } },
              { wildcard: { 'osquery.path': '*LaunchAgents*' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.label',
            },
          },
        },
      },

      // Software - Launch daemons (macOS)
      'endpoint.software.launch_daemons_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.program' } },
              { wildcard: { 'osquery.path': '*LaunchDaemons*' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.label',
            },
          },
        },
      },

      // Software - Scheduled tasks (Windows)
      'endpoint.software.scheduled_tasks_count': {
        filter: { exists: { field: 'osquery.action' } },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.name',
            },
          },
        },
      },

      // Software - Unsigned applications
      'endpoint.software.unsigned_apps_count': {
        filter: {
          bool: {
            must: [
              { exists: { field: 'osquery.path' } },
              { term: { 'osquery.signed': '0' } },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.path',
            },
          },
        },
      },

      // Detections - Encoded PowerShell commands (LOTL)
      'endpoint.detections.encoded_powershell_count': {
        filter: {
          bool: {
            should: [
              { wildcard: { 'osquery.cmdline': '*-enc*' } },
              { wildcard: { 'osquery.cmdline': '*-EncodedCommand*' } },
              { wildcard: { 'osquery.cmdline': '*FromBase64String*' } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.cmdline',
            },
          },
        },
      },

      // Detections - Hidden files in temp directories
      'endpoint.detections.hidden_temp_files_count': {
        filter: {
          bool: {
            must: [
              { term: { 'osquery.hidden': '1' } },
              {
                bool: {
                  should: [
                    { wildcard: { 'osquery.path': '*tmp*' } },
                    { wildcard: { 'osquery.path': '*temp*' } },
                    { wildcard: { 'osquery.path': '*Temp*' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.path',
            },
          },
        },
      },

      // Detections - Listening on suspicious ports
      'endpoint.detections.suspicious_ports_count': {
        filter: {
          bool: {
            must: [
              { term: { 'osquery.state': 'LISTEN' } },
              {
                bool: {
                  should: [
                    { term: { 'osquery.port': 4444 } },
                    { term: { 'osquery.port': 5555 } },
                    { term: { 'osquery.port': 6666 } },
                    { term: { 'osquery.port': 1337 } },
                    { term: { 'osquery.port': 31337 } },
                    { range: { 'osquery.port': { gte: 49152, lte: 65535 } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          count: {
            cardinality: {
              field: 'osquery.port',
            },
          },
        },
      },

      // Privileges - SSH authorized keys count
      'endpoint.privileges.ssh_keys_count': {
        filter: { exists: { field: 'osquery.key' } },
        aggs: {
          count: {
            value_count: {
              field: 'osquery.key',
            },
          },
        },
      },
    },
  },
  frequency: ENDPOINT_ASSETS_TRANSFORM_FREQUENCY,
  sync: {
    time: {
      field: '@timestamp',
      delay: ENDPOINT_ASSETS_TRANSFORM_DELAY,
    },
  },
  settings: {
    max_page_search_size: 1000,
    docs_per_second: null,
  },
  _meta: {
    version: '1.0.0',
    managed: true,
    managed_by: 'osquery',
    entity_sub_type: ENDPOINT_ASSETS_ENTITY_SUB_TYPE.ENDPOINT,
    entity_source: ENDPOINT_ASSETS_ENTITY_SOURCE.OSQUERY,
  },
});
