/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * Elasticsearch mapping for endpoint assets index
 *
 * Index pattern: logs-osquery_manager.endpoint_assets-*
 * Purpose: CAASM (Cyber Asset Attack Surface Management) endpoint visibility
 * Entity Store compatible: Yes (entity.* fields)
 */
export const endpointAssetsMapping: MappingTypeMapping = {
  properties: {
    entity: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        sub_type: { type: 'keyword' },
        source: { type: 'keyword' },
        risk: {
          properties: {
            calculated_level: { type: 'keyword' },
            calculated_score: { type: 'float' },
          },
        },
      },
    },
    asset: {
      properties: {
        criticality: { type: 'keyword' },
        platform: { type: 'keyword' },
        category: { type: 'keyword' },
      },
    },
    host: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        hostname: { type: 'keyword' },
        os: {
          properties: {
            name: { type: 'keyword' },
            version: { type: 'keyword' },
            platform: { type: 'keyword' },
            family: { type: 'keyword' },
            build: { type: 'keyword' },
            kernel: { type: 'keyword' },
          },
        },
        architecture: { type: 'keyword' },
        ip: { type: 'ip' },
        mac: { type: 'keyword' },
      },
    },
    agent: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        version: { type: 'keyword' },
      },
    },
    endpoint: {
      properties: {
        lifecycle: {
          properties: {
            first_seen: { type: 'date' },
            last_seen: { type: 'date' },
            last_updated: { type: 'date' },
          },
        },
        hardware: {
          properties: {
            cpu: { type: 'keyword' },
            cpu_cores: { type: 'integer' },
            memory_gb: { type: 'float' },
            vendor: { type: 'keyword' },
            model: { type: 'keyword' },
            disk: {
              properties: {
                total_capacity_gb: { type: 'float' },
                total_free_gb: { type: 'float' },
                usage_percent: { type: 'float' },
              },
            },
            usb_removable_count: { type: 'integer' },
          },
        },
        network: {
          properties: {
            interfaces: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                mac: { type: 'keyword' },
                ip: { type: 'ip' },
              },
            },
            listening_ports_count: { type: 'integer' },
          },
        },
        software: {
          properties: {
            installed_count: { type: 'integer' },
            services_count: { type: 'integer' },
            browser_extensions_count: { type: 'integer' },
            chrome_extensions_count: { type: 'integer' },
            startup_items_count: { type: 'integer' },
            launch_agents_count: { type: 'integer' },
            launch_daemons_count: { type: 'integer' },
            scheduled_tasks_count: { type: 'integer' },
            unsigned_apps_count: { type: 'integer' },
          },
        },
        posture: {
          properties: {
            score: { type: 'integer' },
            level: { type: 'keyword' },
            disk_encryption: { type: 'keyword' },
            firewall_enabled: { type: 'boolean' },
            secure_boot: { type: 'boolean' },
            sip_enabled: { type: 'boolean' },
            gatekeeper_enabled: { type: 'boolean' },
            checks: {
              properties: {
                passed: { type: 'integer' },
                failed: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
            failed_checks: { type: 'keyword' },
          },
        },
        privileges: {
          properties: {
            local_admins: { type: 'keyword' },
            admin_count: { type: 'integer' },
            root_users: { type: 'keyword' },
            elevated_risk: { type: 'boolean' },
            ssh_keys_count: { type: 'integer' },
          },
        },
        drift: {
          properties: {
            last_change: { type: 'date' },
            change_types: { type: 'keyword' },
            recently_changed: { type: 'boolean' },
          },
        },
        queries: {
          properties: {
            total_results: { type: 'integer' },
          },
        },
        detections: {
          properties: {
            encoded_powershell_count: { type: 'integer' },
            hidden_temp_files_count: { type: 'integer' },
            suspicious_ports_count: { type: 'integer' },
          },
        },
      },
    },
    event: {
      properties: {
        ingested: { type: 'date' },
        kind: { type: 'keyword' },
      },
    },
    '@timestamp': { type: 'date' },
  },
};
