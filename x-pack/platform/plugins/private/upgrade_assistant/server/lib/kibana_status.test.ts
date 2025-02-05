/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/server/mocks';
import type { DomainDeprecationDetails } from '@kbn/core/server';

import { getKibanaUpgradeStatus } from './kibana_status';

const mockKibanaDeprecations = (): DomainDeprecationDetails[] => [
  {
    title: 'mock-deprecation-title',
    correctiveActions: {
      manualSteps: [
        'Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.',
        'Using Kibana role-mapping management, change all role-mappings which assing the kibana_user role to the kibana_admin role.',
      ],
    },
    deprecationType: 'feature',
    documentationUrl: 'testDocUrl',
    level: 'critical',
    message: 'testMessage',
    requireRestart: true,
    domainId: 'security',
  },
];

describe('getKibanaUpgradeStatus', () => {
  const deprecationsClient = deprecationsServiceMock.createClient();

  deprecationsClient.getAllDeprecations.mockResolvedValue(mockKibanaDeprecations());

  it('returns the correct shape of data', async () => {
    const resp = await getKibanaUpgradeStatus(deprecationsClient);
    expect(resp).toMatchSnapshot();
  });

  it('returns totalCriticalDeprecations > 0 when critical issues found', async () => {
    deprecationsClient.getAllDeprecations.mockResolvedValue(mockKibanaDeprecations());

    await expect(getKibanaUpgradeStatus(deprecationsClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      1
    );
  });

  it('returns totalCriticalDeprecations === 0 when no critical issues found', async () => {
    deprecationsClient.getAllDeprecations.mockResolvedValue([]);

    await expect(getKibanaUpgradeStatus(deprecationsClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      0
    );
  });

  it('returns totalCriticalDeprecations > 0, but ignores API deprecations', async () => {
    deprecationsClient.getAllDeprecations.mockResolvedValue([
      ...mockKibanaDeprecations(),
      ...mockKibanaDeprecations(),
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'warning',
        message: 'testMessage',
        domainId: 'security',
      },
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'critical',
        message: 'testMessage',
        domainId: 'security',
      },
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'critical',
        message: 'testMessage',
        domainId: 'security',
      },
    ]);

    await expect(getKibanaUpgradeStatus(deprecationsClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      2
    );
  });

  it('returns totalCriticalDeprecations === 0 when only critical API deprecations', async () => {
    deprecationsClient.getAllDeprecations.mockResolvedValue([
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'warning',
        message: 'testMessage',
        domainId: 'security',
      },
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'critical',
        message: 'testMessage',
        domainId: 'security',
      },
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: [],
        },
        apiId: 'foo',
        deprecationType: 'api',
        documentationUrl: 'testDocUrl',
        level: 'critical',
        message: 'testMessage',
        domainId: 'security',
      },
    ]);

    await expect(getKibanaUpgradeStatus(deprecationsClient)).resolves.toHaveProperty(
      'totalCriticalDeprecations',
      0
    );
  });
});
