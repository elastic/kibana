/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { deleteServiceDashboardRoute } from './delete_service_dashboard';
import { getServiceDashboardsRoute } from './get_service_dashboards';
import { saveServiceDashboardRoute } from './save_service_dashboard';

describe('deleteServiceDashboardRoute params', () => {
  it('accepts a customDashboardId', () => {
    const result = deleteServiceDashboardRoute.params!.safeParse({
      query: { customDashboardId: 'abc' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing customDashboardId', () => {
    expectParseError(deleteServiceDashboardRoute.params!.safeParse({ query: {} }));
  });
});

describe('getServiceDashboardsRoute params', () => {
  it('accepts path + range query', () => {
    const result = getServiceDashboardsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });
});

describe('saveServiceDashboardRoute params', () => {
  it('accepts a body without an explicit query', () => {
    const result = saveServiceDashboardRoute.params!.safeParse({
      body: {
        dashboardSavedObjectId: 'abc',
        serviceNameFilterEnabled: true,
        serviceEnvironmentFilterEnabled: false,
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional query and body kuery', () => {
    const result = saveServiceDashboardRoute.params!.safeParse({
      query: { customDashboardId: 'abc' },
      body: {
        dashboardSavedObjectId: 'abc',
        kuery: 'service.name:opbeans-java',
        serviceNameFilterEnabled: true,
        serviceEnvironmentFilterEnabled: false,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required body field', () => {
    const result = saveServiceDashboardRoute.params!.safeParse({
      body: { dashboardSavedObjectId: 'abc', serviceNameFilterEnabled: true },
    });

    expectParseError(result);
  });
});
