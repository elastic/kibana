/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { setupFleetPackages, removeFleetPackages } from '../../fixtures/fleet_helpers';

const ALL_MODULE_IDS = [
  'apache_data_stream',
  'apache_ecs',
  'apm_transaction',
  'auditbeat_process_docker_ecs',
  'logs_ui_analysis',
  'logs_ui_categories',
  'metricbeat_system_ecs',
  'metrics_ui_hosts',
  'metrics_ui_k8s',
  'nginx_data_stream',
  'nginx_ecs',
  'sample_data_ecommerce',
  'sample_data_weblogs',
  'security_auth',
  'security_azure_activitylogs',
  'security_cloudtrail',
  'security_gcp_audit',
  'security_host',
  'security_linux_v3',
  'security_network',
  'security_packetbeat',
  'security_windows_v3',
  'uptime_heartbeat',
];

const SECURITY_MODULE_IDS = [
  'auditbeat_process_docker_ecs',
  'logs_ui_analysis',
  'logs_ui_categories',
  'security_auth',
  'security_azure_activitylogs',
  'security_cloudtrail',
  'security_gcp_audit',
  'security_host',
  'security_linux_v3',
  'security_network',
  'security_packetbeat',
  'security_windows_v3',
];

// TODO: Add @cloud-stateful-classic once ECH custom-role support lands (see get_filters.spec.ts TODO).
apiTest.describe('get_module: list and filter', { tag: '@local-stateful-classic' }, () => {
  // Fleet packages register apache_data_stream / nginx_data_stream in the ML module registry
  apiTest.beforeAll(async ({ apiServices, kbnClient }) => {
    await setupFleetPackages(apiServices, kbnClient);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await removeFleetPackages(apiServices);
  });

  apiTest('lists all modules in expected order', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    const res = await apiClient.get('internal/ml/modules/get_module/', {
      headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(res).toHaveStatusCode(200);
    expect(Array.isArray(res.body)).toBe(true);
    const responseModuleIds = (res.body as Array<{ id: string }>).map((m) => m.id);
    expect(responseModuleIds).toStrictEqual(ALL_MODULE_IDS);
  });

  apiTest(
    'lists only security modules when filtered by security',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get('internal/ml/modules/get_module/?filter=security', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(Array.isArray(res.body)).toBe(true);
      const responseModuleIds = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(responseModuleIds).toStrictEqual(SECURITY_MODULE_IDS);
    }
  );

  apiTest(
    'returns 404 when filtering a non-security module by security tag',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(
        'internal/ml/modules/get_module/apm_transaction?filter=security',
        {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      expect(res).toHaveStatusCode(404);
    }
  );
});
