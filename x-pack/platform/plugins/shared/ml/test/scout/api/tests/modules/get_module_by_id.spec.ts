/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { setupFleetPackages, removeFleetPackages } from '../../fixtures/fleet_helpers';

const MODULE_IDS = [
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

// TODO: Add @cloud-stateful-classic once ECH custom-role support lands (see get_filters.spec.ts TODO).
apiTest.describe('get_module: load each module by ID', { tag: '@local-stateful-classic' }, () => {
  // Fleet packages register apache_data_stream / nginx_data_stream in the ML module registry
  apiTest.beforeAll(async ({ apiServices, kbnClient }) => {
    await setupFleetPackages(apiServices, kbnClient);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await removeFleetPackages(apiServices);
  });

  apiTest('loads each module and verifies response shape', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asMlPoweruser();

    for (const moduleId of MODULE_IDS) {
      await apiTest.step(`loads module ${moduleId}`, async () => {
        const res = await apiClient.get(`internal/ml/modules/get_module/${moduleId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        const body = res.body as Record<string, unknown>;

        // Every module must have these required fields with valid types
        expect(body.id).toBe(moduleId);
        expect(typeof body.title).toBe('string');
        expect(typeof body.description).toBe('string');
        expect(typeof body.type).toBe('string');
        expect(Array.isArray(body.jobs)).toBe(true);
        expect(Array.isArray(body.datafeeds)).toBe(true);

        // Optional string fields, when present, must be strings
        const optionalStringFields = ['logoFile', 'defaultIndexPattern'];
        for (const field of optionalStringFields) {
          expect(body[field] === undefined || typeof body[field] === 'string').toBe(true);
        }
        // Optional object fields, when present, must be objects
        expect(
          body.logo === undefined || (typeof body.logo === 'object' && body.logo !== null)
        ).toBe(true);
      });
    }
  });
});
