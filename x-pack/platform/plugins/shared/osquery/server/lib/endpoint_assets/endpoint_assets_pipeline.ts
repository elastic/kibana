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

          // Extract hardware fields
          if (ctx.endpoint == null) { ctx.endpoint = new HashMap(); }
          if (ctx.endpoint.hardware == null) { ctx.endpoint.hardware = new HashMap(); }

          if (ctx.tmp_hardware_cpu != null && ctx.tmp_hardware_cpu.containsKey('osquery.cpu_brand')) {
            ctx.endpoint.hardware.cpu = ctx.tmp_hardware_cpu['osquery.cpu_brand'];
          }
          if (ctx.tmp_hardware_cpu_cores != null && ctx.tmp_hardware_cpu_cores.containsKey('osquery.cpu_physical_cores')) {
            def cores = ctx.tmp_hardware_cpu_cores['osquery.cpu_physical_cores'];
            if (cores != null) {
              ctx.endpoint.hardware.cpu_cores = Integer.parseInt(cores.toString());
            }
          }
          if (ctx.tmp_hardware_memory_gb != null && ctx.tmp_hardware_memory_gb.containsKey('osquery.physical_memory')) {
            def memBytes = ctx.tmp_hardware_memory_gb['osquery.physical_memory'];
            if (memBytes != null) {
              ctx.endpoint.hardware.memory_gb = Double.parseDouble(memBytes.toString()) / (1024 * 1024 * 1024);
            }
          }
          if (ctx.tmp_hardware_vendor != null && ctx.tmp_hardware_vendor.containsKey('osquery.hardware_vendor')) {
            ctx.endpoint.hardware.vendor = ctx.tmp_hardware_vendor['osquery.hardware_vendor'];
          }
          if (ctx.tmp_hardware_model != null && ctx.tmp_hardware_model.containsKey('osquery.hardware_model')) {
            ctx.endpoint.hardware.model = ctx.tmp_hardware_model['osquery.hardware_model'];
          }

          // Extract disk fields from top_metrics (osquery.disk_size is a keyword field)
          if (ctx.endpoint.hardware.disk == null) { ctx.endpoint.hardware.disk = new HashMap(); }
          if (ctx.tmp_disk_size != null && ctx.tmp_disk_size.containsKey('osquery.disk_size')) {
            def diskBytes = ctx.tmp_disk_size['osquery.disk_size'];
            if (diskBytes != null && diskBytes.toString() != 'null') {
              try {
                ctx.endpoint.hardware.disk.total_capacity_gb = Double.parseDouble(diskBytes.toString()) / (1024.0 * 1024.0 * 1024.0);
              } catch (Exception e) {}
            }
          }
          if (ctx.tmp_disk_free != null && ctx.tmp_disk_free.containsKey('osquery.free_space')) {
            def freeBytes = ctx.tmp_disk_free['osquery.free_space'];
            if (freeBytes != null && freeBytes.toString() != 'null') {
              try {
                ctx.endpoint.hardware.disk.total_free_gb = Double.parseDouble(freeBytes.toString()) / (1024.0 * 1024.0 * 1024.0);
              } catch (Exception e) {}
            }
          }
          // Calculate disk usage percentage
          if (ctx.endpoint.hardware.disk.total_capacity_gb != null && ctx.endpoint.hardware.disk.total_capacity_gb > 0) {
            def used = ctx.endpoint.hardware.disk.total_capacity_gb - (ctx.endpoint.hardware.disk.total_free_gb != null ? ctx.endpoint.hardware.disk.total_free_gb : 0);
            ctx.endpoint.hardware.disk.usage_percent = (used / ctx.endpoint.hardware.disk.total_capacity_gb) * 100.0;
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
          if (ctx.endpoint.software == null) { ctx.endpoint.software = new HashMap(); }
          if (ctx.endpoint.network == null) { ctx.endpoint.network = new HashMap(); }
          if (ctx.endpoint.hardware == null) { ctx.endpoint.hardware = new HashMap(); }
          if (ctx.endpoint.hardware.disk == null) { ctx.endpoint.hardware.disk = new HashMap(); }
          if (ctx.endpoint.privileges == null) { ctx.endpoint.privileges = new HashMap(); }
          if (ctx.endpoint.detections == null) { ctx.endpoint.detections = new HashMap(); }

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
          if (ctx.endpoint.posture.sip_enabled_raw != null && ctx.endpoint.posture.sip_enabled_raw._value != null) {
            def sipValue = ctx.endpoint.posture.sip_enabled_raw._value;
            if (sipValue.containsKey('osquery.config_flag')) {
              ctx.endpoint.posture.sip_enabled_raw = sipValue['osquery.config_flag'];
            }
          }
          if (ctx.endpoint.posture.gatekeeper_enabled_raw != null && ctx.endpoint.posture.gatekeeper_enabled_raw._value != null) {
            def gkValue = ctx.endpoint.posture.gatekeeper_enabled_raw._value;
            if (gkValue.containsKey('osquery.assessments_enabled')) {
              ctx.endpoint.posture.gatekeeper_enabled_raw = gkValue['osquery.assessments_enabled'];
            }
          }

          // Note: Disk fields are now handled in the first script using top_metrics
          // (osquery.disk_size is a keyword field, so we can't use sum aggregation)

          // Hardware - USB removable count
          if (ctx.endpoint.hardware.usb_removable_count != null && ctx.endpoint.hardware.usb_removable_count.count != null) {
            ctx.endpoint.hardware.usb_removable_count = ctx.endpoint.hardware.usb_removable_count.count;
          }

          // Software count fields
          if (ctx.endpoint.software.installed_count != null && ctx.endpoint.software.installed_count.count != null) {
            ctx.endpoint.software.installed_count = ctx.endpoint.software.installed_count.count;
          }
          if (ctx.endpoint.software.services_count != null && ctx.endpoint.software.services_count.count != null) {
            ctx.endpoint.software.services_count = ctx.endpoint.software.services_count.count;
          }
          if (ctx.endpoint.software.browser_extensions_count != null && ctx.endpoint.software.browser_extensions_count.count != null) {
            ctx.endpoint.software.browser_extensions_count = ctx.endpoint.software.browser_extensions_count.count;
          }
          if (ctx.endpoint.software.chrome_extensions_count != null && ctx.endpoint.software.chrome_extensions_count.count != null) {
            ctx.endpoint.software.chrome_extensions_count = ctx.endpoint.software.chrome_extensions_count.count;
          }
          if (ctx.endpoint.software.startup_items_count != null && ctx.endpoint.software.startup_items_count.count != null) {
            ctx.endpoint.software.startup_items_count = ctx.endpoint.software.startup_items_count.count;
          }
          if (ctx.endpoint.software.launch_agents_count != null && ctx.endpoint.software.launch_agents_count.count != null) {
            ctx.endpoint.software.launch_agents_count = ctx.endpoint.software.launch_agents_count.count;
          }
          if (ctx.endpoint.software.launch_daemons_count != null && ctx.endpoint.software.launch_daemons_count.count != null) {
            ctx.endpoint.software.launch_daemons_count = ctx.endpoint.software.launch_daemons_count.count;
          }
          if (ctx.endpoint.software.scheduled_tasks_count != null && ctx.endpoint.software.scheduled_tasks_count.count != null) {
            ctx.endpoint.software.scheduled_tasks_count = ctx.endpoint.software.scheduled_tasks_count.count;
          }
          if (ctx.endpoint.software.unsigned_apps_count != null && ctx.endpoint.software.unsigned_apps_count.count != null) {
            ctx.endpoint.software.unsigned_apps_count = ctx.endpoint.software.unsigned_apps_count.count;
          }

          // Network count fields
          if (ctx.endpoint.network.listening_ports_count != null && ctx.endpoint.network.listening_ports_count.count != null) {
            ctx.endpoint.network.listening_ports_count = ctx.endpoint.network.listening_ports_count.count;
          }

          // Privileges - SSH keys count
          if (ctx.endpoint.privileges.ssh_keys_count != null && ctx.endpoint.privileges.ssh_keys_count.count != null) {
            ctx.endpoint.privileges.ssh_keys_count = ctx.endpoint.privileges.ssh_keys_count.count;
          }

          // Detections - security detection counts
          if (ctx.endpoint.detections.encoded_powershell_count != null && ctx.endpoint.detections.encoded_powershell_count.count != null) {
            ctx.endpoint.detections.encoded_powershell_count = ctx.endpoint.detections.encoded_powershell_count.count;
          }
          if (ctx.endpoint.detections.hidden_temp_files_count != null && ctx.endpoint.detections.hidden_temp_files_count.count != null) {
            ctx.endpoint.detections.hidden_temp_files_count = ctx.endpoint.detections.hidden_temp_files_count.count;
          }
          if (ctx.endpoint.detections.suspicious_ports_count != null && ctx.endpoint.detections.suspicious_ports_count.count != null) {
            ctx.endpoint.detections.suspicious_ports_count = ctx.endpoint.detections.suspicious_ports_count.count;
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
          'tmp_hardware_cpu',
          'tmp_hardware_cpu_cores',
          'tmp_hardware_memory_gb',
          'tmp_hardware_vendor',
          'tmp_hardware_model',
          'tmp_disk_size',
          'tmp_disk_free',
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
          if (diskRaw == null || diskRaw instanceof Map) {
            ctx.endpoint.posture.disk_encryption = 'UNKNOWN';
          } else if (diskRaw == '1' || diskRaw == 'true' || diskRaw == 'yes') {
            ctx.endpoint.posture.disk_encryption = 'OK';
          } else {
            ctx.endpoint.posture.disk_encryption = 'FAIL';
            score -= 25;
            failedChecks.add('disk_encryption');
          }

          // Firewall - includes Windows-specific 'Good' value
          def fwRaw = ctx.endpoint.posture.firewall_enabled_raw;
          boolean fwValid = fwRaw != null && !(fwRaw instanceof Map);
          ctx.endpoint.posture.firewall_enabled = fwValid && (fwRaw == '1' || fwRaw == 'true' || fwRaw == 'yes' || fwRaw == 'Good' || fwRaw == 'on' || fwRaw == 'enabled');
          if (ctx.endpoint.posture.firewall_enabled == false && fwValid) {
            score -= 20;
            failedChecks.add('firewall_disabled');
          }

          // Secure boot
          def sbRaw = ctx.endpoint.posture.secure_boot_raw;
          boolean sbValid = sbRaw != null && !(sbRaw instanceof Map);
          ctx.endpoint.posture.secure_boot = sbValid && (sbRaw == '1' || sbRaw == 'true' || sbRaw == 'yes');
          if (ctx.endpoint.posture.secure_boot == false && sbValid) {
            score -= 15;
            failedChecks.add('secure_boot_disabled');
          }

          // SIP (System Integrity Protection) - macOS only
          def sipRaw = ctx.endpoint.posture.sip_enabled_raw;
          boolean sipValid = sipRaw != null && !(sipRaw instanceof Map);
          ctx.endpoint.posture.sip_enabled = sipValid && (sipRaw == '1' || sipRaw == 'true' || sipRaw == 'enabled');
          if (sipValid && ctx.endpoint.posture.sip_enabled == false) {
            score -= 15;
            failedChecks.add('sip_disabled');
          }

          // Gatekeeper - macOS only
          def gkRaw = ctx.endpoint.posture.gatekeeper_enabled_raw;
          boolean gkValid = gkRaw != null && !(gkRaw instanceof Map);
          ctx.endpoint.posture.gatekeeper_enabled = gkValid && (gkRaw == '1' || gkRaw == 'true' || gkRaw == 'yes');
          if (gkValid && ctx.endpoint.posture.gatekeeper_enabled == false) {
            score -= 10;
            failedChecks.add('gatekeeper_disabled');
          }

          // Admin count check - use flattened value (now a simple number, not nested)
          int adminCount = 0;
          if (ctx.endpoint.privileges.admin_count != null && ctx.endpoint.privileges.admin_count instanceof Number) {
            adminCount = ctx.endpoint.privileges.admin_count.intValue();
          }
          if (adminCount > 2) {
            score -= 10;
            failedChecks.add('excessive_admins');
            ctx.endpoint.privileges.elevated_risk = true;
          } else {
            ctx.endpoint.privileges.elevated_risk = false;
          }

          // Unsigned applications check - use flattened value
          int unsignedApps = 0;
          if (ctx.endpoint.software.unsigned_apps_count != null && ctx.endpoint.software.unsigned_apps_count instanceof Number) {
            unsignedApps = ctx.endpoint.software.unsigned_apps_count.intValue();
          }
          if (unsignedApps > 5) {
            score -= 5;
            failedChecks.add('unsigned_applications');
          }

          // Security detections check - use flattened values
          int encodedPS = 0;
          int hiddenFiles = 0;
          int suspiciousPorts = 0;
          if (ctx.endpoint.detections.encoded_powershell_count != null && ctx.endpoint.detections.encoded_powershell_count instanceof Number) {
            encodedPS = ctx.endpoint.detections.encoded_powershell_count.intValue();
          }
          if (ctx.endpoint.detections.hidden_temp_files_count != null && ctx.endpoint.detections.hidden_temp_files_count instanceof Number) {
            hiddenFiles = ctx.endpoint.detections.hidden_temp_files_count.intValue();
          }
          if (ctx.endpoint.detections.suspicious_ports_count != null && ctx.endpoint.detections.suspicious_ports_count instanceof Number) {
            suspiciousPorts = ctx.endpoint.detections.suspicious_ports_count.intValue();
          }
          int totalDetections = encodedPS + hiddenFiles + suspiciousPorts;

          if (totalDetections > 0) {
            score -= Math.min(20, totalDetections * 5);
            failedChecks.add('security_detections');
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
          def totalChecks = 8;
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
          if (ctx.endpoint.privileges.root_users == null) {
            ctx.endpoint.privileges.root_users = new ArrayList();
          }

          // Initialize software defaults
          if (ctx.endpoint.software == null) { ctx.endpoint.software = new HashMap(); }
          if (ctx.endpoint.software.installed_count == null) {
            ctx.endpoint.software.installed_count = 0;
          }
          if (ctx.endpoint.software.services_count == null) {
            ctx.endpoint.software.services_count = 0;
          }
          if (ctx.endpoint.software.browser_extensions_count == null) {
            ctx.endpoint.software.browser_extensions_count = 0;
          }
          if (ctx.endpoint.software.chrome_extensions_count == null) {
            ctx.endpoint.software.chrome_extensions_count = 0;
          }
          if (ctx.endpoint.software.startup_items_count == null) {
            ctx.endpoint.software.startup_items_count = 0;
          }
          if (ctx.endpoint.software.launch_agents_count == null) {
            ctx.endpoint.software.launch_agents_count = 0;
          }
          if (ctx.endpoint.software.launch_daemons_count == null) {
            ctx.endpoint.software.launch_daemons_count = 0;
          }
          if (ctx.endpoint.software.scheduled_tasks_count == null) {
            ctx.endpoint.software.scheduled_tasks_count = 0;
          }
          if (ctx.endpoint.software.unsigned_apps_count == null) {
            ctx.endpoint.software.unsigned_apps_count = 0;
          }

          // Initialize network defaults
          if (ctx.endpoint.network == null) { ctx.endpoint.network = new HashMap(); }
          if (ctx.endpoint.network.listening_ports_count == null) {
            ctx.endpoint.network.listening_ports_count = 0;
          }
          if (ctx.endpoint.network.interfaces == null) {
            ctx.endpoint.network.interfaces = new ArrayList();
          }

          // Initialize hardware defaults
          if (ctx.endpoint.hardware == null) { ctx.endpoint.hardware = new HashMap(); }
          if (ctx.endpoint.hardware.disk == null) { ctx.endpoint.hardware.disk = new HashMap(); }
          if (ctx.endpoint.hardware.usb_removable_count == null) {
            ctx.endpoint.hardware.usb_removable_count = 0;
          }

          // Initialize privileges defaults - SSH keys
          if (ctx.endpoint.privileges.ssh_keys_count == null) {
            ctx.endpoint.privileges.ssh_keys_count = 0;
          }

          // Initialize detections defaults
          if (ctx.endpoint.detections == null) { ctx.endpoint.detections = new HashMap(); }
          if (ctx.endpoint.detections.encoded_powershell_count == null) {
            ctx.endpoint.detections.encoded_powershell_count = 0;
          }
          if (ctx.endpoint.detections.hidden_temp_files_count == null) {
            ctx.endpoint.detections.hidden_temp_files_count = 0;
          }
          if (ctx.endpoint.detections.suspicious_ports_count == null) {
            ctx.endpoint.detections.suspicious_ports_count = 0;
          }

          // Initialize lifecycle defaults
          if (ctx.endpoint.lifecycle == null) { ctx.endpoint.lifecycle = new HashMap(); }

          // Initialize drift defaults
          if (ctx.endpoint.drift == null) { ctx.endpoint.drift = new HashMap(); }
          if (ctx.endpoint.drift.change_types == null) {
            ctx.endpoint.drift.change_types = new ArrayList();
          }
          if (ctx.endpoint.drift.recently_changed == null) {
            ctx.endpoint.drift.recently_changed = false;
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
