/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ENDPOINT_ASSETS_PIPELINE_PREFIX,
  ENDPOINT_ASSETS_ENTITY_TYPE,
  ENDPOINT_ASSETS_ENTITY_SUB_TYPE,
  ENDPOINT_ASSETS_ENTITY_SOURCE,
} from '../../../common/constants';

/**
 * Get the ingest pipeline ID for the given namespace
 */
export const getEndpointAssetsPipelineId = (namespace: string): string =>
  `${ENDPOINT_ASSETS_PIPELINE_PREFIX}${namespace}`;

/**
 * Ingest pipeline for post-processing transform output.
 *
 * This pipeline:
 * - Flattens tmp_* fields from top_metrics aggregation to proper ECS paths
 * - Sets static entity fields (entity.type, entity.sub_type, entity.source)
 * - Converts raw posture values to boolean/enum
 * - Calculates posture score
 * - Sets event metadata
 *
 * IMPORTANT: Uses Painless scripts with containsKey() because top_metrics outputs
 * nested structures like {"host.os.name": "value"} where the key contains dots.
 * Mustache templates don't work for this - they interpret dots as nested paths.
 */
export const getEndpointAssetsPipelineConfig = (
  namespace: string
): IngestPutPipelineRequest => ({
  id: getEndpointAssetsPipelineId(namespace),
  description: 'Post-process endpoint asset documents for Entity Store compatibility',
  processors: [
    // Initialize nested structures and extract tmp_ fields using Painless script
    {
      script: {
        lang: 'painless',
        description: 'Initialize nested structures and extract tmp_ fields to ECS paths',
        source: `
          // Initialize nested structures
          if (ctx.host == null) { ctx.host = new HashMap(); }
          if (ctx.host.os == null) { ctx.host.os = new HashMap(); }
          if (ctx.agent == null) { ctx.agent = new HashMap(); }
          if (ctx.asset == null) { ctx.asset = new HashMap(); }
          if (ctx.entity == null) { ctx.entity = new HashMap(); }

          // Extract host fields from tmp_ prefixed top_metrics output
          if (ctx.tmp_host_id != null && ctx.tmp_host_id.containsKey('host.id')) {
            ctx.host.id = ctx.tmp_host_id['host.id'];
          }
          if (ctx.tmp_host_name != null && ctx.tmp_host_name.containsKey('host.name')) {
            ctx.host.name = ctx.tmp_host_name['host.name'];
          }
          if (ctx.tmp_host_hostname != null && ctx.tmp_host_hostname.containsKey('host.hostname')) {
            ctx.host.hostname = ctx.tmp_host_hostname['host.hostname'];
          }
          if (ctx.tmp_host_os_name != null && ctx.tmp_host_os_name.containsKey('host.os.name')) {
            ctx.host.os.name = ctx.tmp_host_os_name['host.os.name'];
          }
          if (ctx.tmp_host_os_version != null && ctx.tmp_host_os_version.containsKey('host.os.version')) {
            ctx.host.os.version = ctx.tmp_host_os_version['host.os.version'];
          }
          if (ctx.tmp_host_os_platform != null && ctx.tmp_host_os_platform.containsKey('host.os.platform')) {
            ctx.host.os.platform = ctx.tmp_host_os_platform['host.os.platform'];
          }
          if (ctx.tmp_host_os_family != null && ctx.tmp_host_os_family.containsKey('host.os.family')) {
            ctx.host.os.family = ctx.tmp_host_os_family['host.os.family'];
          }
          if (ctx.tmp_host_os_build != null && ctx.tmp_host_os_build.containsKey('host.os.build')) {
            ctx.host.os.build = ctx.tmp_host_os_build['host.os.build'];
          }
          if (ctx.tmp_host_os_kernel != null && ctx.tmp_host_os_kernel.containsKey('host.os.kernel')) {
            ctx.host.os.kernel = ctx.tmp_host_os_kernel['host.os.kernel'];
          }
          if (ctx.tmp_host_architecture != null && ctx.tmp_host_architecture.containsKey('host.architecture')) {
            ctx.host.architecture = ctx.tmp_host_architecture['host.architecture'];
          }
          if (ctx.tmp_host_ip != null && ctx.tmp_host_ip.containsKey('host.ip')) {
            ctx.host.ip = ctx.tmp_host_ip['host.ip'];
          }
          if (ctx.tmp_host_mac != null && ctx.tmp_host_mac.containsKey('host.mac')) {
            ctx.host.mac = ctx.tmp_host_mac['host.mac'];
          }

          // Extract agent fields
          if (ctx.tmp_agent_id != null && ctx.tmp_agent_id.containsKey('agent.id')) {
            ctx.agent.id = ctx.tmp_agent_id['agent.id'];
          }
          if (ctx.tmp_agent_name != null && ctx.tmp_agent_name.containsKey('agent.name')) {
            ctx.agent.name = ctx.tmp_agent_name['agent.name'];
          }
          if (ctx.tmp_agent_type != null && ctx.tmp_agent_type.containsKey('agent.type')) {
            ctx.agent.type = ctx.tmp_agent_type['agent.type'];
          }
          if (ctx.tmp_agent_version != null && ctx.tmp_agent_version.containsKey('agent.version')) {
            ctx.agent.version = ctx.tmp_agent_version['agent.version'];
          }

          // Extract asset platform
          if (ctx.tmp_asset_platform != null && ctx.tmp_asset_platform.containsKey('host.os.platform')) {
            ctx.asset.platform = ctx.tmp_asset_platform['host.os.platform'];
          }
        `,
      },
    },
    // Flatten nested filter aggregation structures
    {
      script: {
        lang: 'painless',
        description: 'Flatten nested filter aggregation structures',
        source: `
          // Initialize endpoint structure if needed
          if (ctx.endpoint == null) { ctx.endpoint = new HashMap(); }
          if (ctx.endpoint.posture == null) { ctx.endpoint.posture = new HashMap(); }

          // Posture raw fields from filtered aggregations
          if (ctx.endpoint.posture.disk_encryption_raw != null && ctx.endpoint.posture.disk_encryption_raw._value != null) {
            def encValue = ctx.endpoint.posture.disk_encryption_raw._value;
            if (encValue.containsKey('osquery.encrypted')) {
              ctx.endpoint.posture.disk_encryption_raw = encValue['osquery.encrypted'];
            }
          }
          if (ctx.endpoint.posture.firewall_enabled_raw != null && ctx.endpoint.posture.firewall_enabled_raw._value != null) {
            def fwValue = ctx.endpoint.posture.firewall_enabled_raw._value;
            if (fwValue.containsKey('osquery.firewall_enabled')) {
              ctx.endpoint.posture.firewall_enabled_raw = fwValue['osquery.firewall_enabled'];
            } else if (fwValue.containsKey('osquery.global_state')) {
              ctx.endpoint.posture.firewall_enabled_raw = fwValue['osquery.global_state'];
            }
          }
          if (ctx.endpoint.posture.secure_boot_raw != null && ctx.endpoint.posture.secure_boot_raw._value != null) {
            def sbValue = ctx.endpoint.posture.secure_boot_raw._value;
            if (sbValue.containsKey('osquery.secure_boot')) {
              ctx.endpoint.posture.secure_boot_raw = sbValue['osquery.secure_boot'];
            }
          }
        `,
      },
    },
    // Remove temporary tmp_* fields after flattening
    {
      remove: {
        field: [
          'tmp_host_id',
          'tmp_host_name',
          'tmp_host_hostname',
          'tmp_host_os_name',
          'tmp_host_os_version',
          'tmp_host_os_platform',
          'tmp_host_os_family',
          'tmp_host_os_build',
          'tmp_host_os_kernel',
          'tmp_host_architecture',
          'tmp_host_ip',
          'tmp_host_mac',
          'tmp_agent_id',
          'tmp_agent_name',
          'tmp_agent_type',
          'tmp_agent_version',
          'tmp_asset_platform',
        ],
        ignore_missing: true,
      },
    },
    // Set static entity fields
    {
      set: {
        field: 'entity.type',
        value: ENDPOINT_ASSETS_ENTITY_TYPE.HOST,
      },
    },
    {
      set: {
        field: 'entity.sub_type',
        value: ENDPOINT_ASSETS_ENTITY_SUB_TYPE.ENDPOINT,
      },
    },
    {
      set: {
        field: 'entity.source',
        value: ENDPOINT_ASSETS_ENTITY_SOURCE.OSQUERY,
      },
    },
    {
      set: {
        field: 'asset.category',
        value: 'endpoint',
      },
    },
    // Set event metadata
    {
      set: {
        field: 'event.kind',
        value: 'state',
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{_ingest.timestamp}}',
      },
    },
    // Copy entity.id and entity.name from host fields if not set
    {
      script: {
        lang: 'painless',
        description: 'Copy entity.id/name from host if not set',
        source: `
          if (ctx.entity == null) { ctx.entity = new HashMap(); }
          if (ctx.entity.id == null && ctx.host != null && ctx.host.id != null) {
            ctx.entity.id = ctx.host.id;
          }
          if (ctx.entity.name == null && ctx.host != null && ctx.host.name != null) {
            ctx.entity.name = ctx.host.name;
          }
        `,
      },
    },
    // Convert posture raw values and calculate score
    {
      script: {
        lang: 'painless',
        description: 'Convert posture values and calculate score',
        source: `
          if (ctx.endpoint == null) { ctx.endpoint = new HashMap(); }
          if (ctx.endpoint.posture == null) { ctx.endpoint.posture = new HashMap(); }
          if (ctx.endpoint.privileges == null) { ctx.endpoint.privileges = new HashMap(); }

          int score = 100;
          def failedChecks = new ArrayList();

          // Disk encryption
          def diskRaw = ctx.endpoint.posture.disk_encryption_raw;
          if (diskRaw == null) {
            ctx.endpoint.posture.disk_encryption = 'UNKNOWN';
          } else if (diskRaw == '1' || diskRaw == 'true' || diskRaw == 'yes') {
            ctx.endpoint.posture.disk_encryption = 'OK';
          } else {
            ctx.endpoint.posture.disk_encryption = 'FAIL';
            score -= 25;
            failedChecks.add('disk_encryption');
          }

          // Firewall
          def fwRaw = ctx.endpoint.posture.firewall_enabled_raw;
          ctx.endpoint.posture.firewall_enabled = (fwRaw == '1' || fwRaw == 'true' || fwRaw == 'yes');
          if (ctx.endpoint.posture.firewall_enabled == false) {
            score -= 20;
            failedChecks.add('firewall_disabled');
          }

          // Secure boot
          def sbRaw = ctx.endpoint.posture.secure_boot_raw;
          ctx.endpoint.posture.secure_boot = (sbRaw == '1' || sbRaw == 'true' || sbRaw == 'yes');
          if (ctx.endpoint.posture.secure_boot == false) {
            score -= 15;
            failedChecks.add('secure_boot_disabled');
          }

          // Admin count check
          def adminCount = ctx.endpoint.privileges.admin_count?.count?.value;
          if (adminCount != null && adminCount > 2) {
            score -= 10;
            failedChecks.add('excessive_admins');
          }

          // Set score and level
          ctx.endpoint.posture.score = Math.max(0, score);
          ctx.endpoint.posture.failed_checks = failedChecks;

          if (score <= 49) {
            ctx.endpoint.posture.level = 'CRITICAL';
          } else if (score <= 69) {
            ctx.endpoint.posture.level = 'HIGH';
          } else if (score <= 89) {
            ctx.endpoint.posture.level = 'MEDIUM';
          } else {
            ctx.endpoint.posture.level = 'LOW';
          }

          // Posture checks summary
          def totalChecks = 4;
          def passedChecks = totalChecks - failedChecks.size();
          ctx.endpoint.posture.checks = new HashMap();
          ctx.endpoint.posture.checks.passed = passedChecks;
          ctx.endpoint.posture.checks.failed = failedChecks.size();
          ctx.endpoint.posture.checks.total = totalChecks;

          // Initialize privileges defaults
          if (ctx.endpoint.privileges.admin_count == null) {
            ctx.endpoint.privileges.admin_count = 0;
          }
          if (ctx.endpoint.privileges.elevated_risk == null) {
            ctx.endpoint.privileges.elevated_risk = false;
          }
          if (ctx.endpoint.privileges.local_admins == null) {
            ctx.endpoint.privileges.local_admins = new ArrayList();
          }
        `,
      },
    },
  ],
  _meta: {
    version: '1.0.0',
    managed: true,
    managed_by: 'osquery',
  },
});
