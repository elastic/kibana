/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { packagePolicyService } from '../services';

import { getIntegrationsDetails } from './integrations_collector';

describe('getIntegrationsDetails', () => {
  const soClientMock = savedObjectsClientMock.create();

  it('should return empty array if there are no package policies', async () => {
    packagePolicyService.list = jest.fn().mockResolvedValue({
      items: [],
    });
    expect(await getIntegrationsDetails(soClientMock)).toEqual([]);
  });

  it('should return data about shared integration policies', async () => {
    packagePolicyService.list = jest.fn().mockResolvedValue({
      items: [
        {
          name: 'apache-1',
          package: { name: 'apache', version: '1.0.0' },
          policy_ids: ['agent-1', 'agent-2'],
        },
        {
          name: 'aws-11',
          package: { name: 'aws', version: '1.0.0' },
          policy_ids: ['agent-1'],
          agents: 10,
        },
        { name: 'nginx-1', package: { name: 'aws', version: '1.0.0' } },
      ],
    });
    expect(await getIntegrationsDetails(soClientMock)).toEqual([
      {
        total_integration_policies: 3,
        shared_integration_policies: 1,
        shared_integrations: {
          agents: undefined,
          name: 'apache-1',
          pkg_name: 'apache',
          pkg_version: '1.0.0',
          shared_by_agent_policies: 2,
        },
      },
    ]);
  });

  it('should return data about shared integration policies when there are multiple of them', async () => {
    packagePolicyService.list = jest.fn().mockResolvedValue({
      items: [
        {
          name: 'apache-1',
          package: { name: 'apache', version: '1.0.0' },
          policy_ids: ['agent-1', 'agent-2'],
        },
        {
          name: 'aws-1',
          package: { name: 'aws', version: '1.0.0' },
          policy_ids: ['agent-1', 'agent-3', 'agent-4'],
          agents: 10,
        },
        { name: 'nginx-1', package: { name: 'aws', version: '1.0.0' } },
      ],
    });
    expect(await getIntegrationsDetails(soClientMock)).toEqual([
      {
        total_integration_policies: 3,
        shared_integration_policies: 2,
        shared_integrations: {
          agents: undefined,
          name: 'apache-1',
          pkg_name: 'apache',
          pkg_version: '1.0.0',
          shared_by_agent_policies: 2,
        },
      },
      {
        total_integration_policies: 3,
        shared_integration_policies: 2,
        shared_integrations: {
          agents: 10,
          name: 'aws-1',
          pkg_name: 'aws',
          pkg_version: '1.0.0',
          shared_by_agent_policies: 3,
        },
      },
    ]);
  });

  it('should return empty array if there are no shared integrations', async () => {
    packagePolicyService.list = jest.fn().mockResolvedValue({
      items: [
        {
          name: 'apache-1',
          package: { name: 'apache', version: '1.0.0' },
        },
        { name: 'nginx-1', package: { name: 'aws', version: '1.0.0' } },
      ],
    });
    expect(await getIntegrationsDetails(soClientMock)).toEqual([]);
  });
});
