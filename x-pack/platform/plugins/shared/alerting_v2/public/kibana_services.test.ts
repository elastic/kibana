/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';

const createMockServices = (): RuleFormServices => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
  lens: lensPluginMock.createStartContract(),
});

describe('kibana_services', () => {
  let setKibanaServices: typeof import('./kibana_services').setKibanaServices;
  let untilPluginStartServicesReady: typeof import('./kibana_services').untilPluginStartServicesReady;

  beforeEach(async () => {
    jest.resetModules();
    // Re-import to get a fresh BehaviorSubject for each test
    const mod = await import('./kibana_services');
    setKibanaServices = mod.setKibanaServices;
    untilPluginStartServicesReady = mod.untilPluginStartServicesReady;
  });

  it('resolves immediately when services are already set', async () => {
    const mockServices = createMockServices();
    setKibanaServices(mockServices);

    const result = await untilPluginStartServicesReady();
    expect(result).toBe(mockServices);
  });

  it('resolves after services are set asynchronously', async () => {
    const mockServices = createMockServices();

    // Start waiting before services are set
    let resolved = false;
    const promise = untilPluginStartServicesReady().then((res) => {
      resolved = true;
      return res;
    });

    // Verify it hasn't resolved yet before services are set
    await new Promise((r) => setTimeout(r, 0));
    expect(resolved).toBe(false);

    // Set services after verifying pending state
    setKibanaServices(mockServices);

    const result = await promise;
    expect(resolved).toBe(true);
    expect(result).toBe(mockServices);
  });
});
