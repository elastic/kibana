/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../agent_policy';

import { appContextService } from '..';
import { getPackagePolicySavedObjectType } from '../package_policy';

import { _updatePackagePoliciesThatNeedBump } from './bump_agent_policies_task';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../package_policy');

const mockedAgentPolicyService = jest.mocked(agentPolicyService);
const mockedAppContextService = jest.mocked(appContextService);
const mockSoClient = {
  find: jest.fn(),
  bulkUpdate: jest.fn(),
} as any;
const mockGetPackagePolicySavedObjectType = jest.mocked(getPackagePolicySavedObjectType);

describe('_updatePackagePoliciesThatNeedBump', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSoClient.find.mockResolvedValue({
      total: 3,
      saved_objects: [
        {
          id: 'packagePolicy1',
          namespaces: ['default'],
          attributes: {
            policy_ids: ['policy1'],
          },
        },
        {
          id: 'packagePolicy12',
          namespaces: ['default'],
          attributes: {
            policy_ids: ['policy1'],
          },
        },
        {
          id: 'packagePolicy2',
          namespaces: ['space'],
          attributes: {
            policy_ids: ['policy2'],
          },
        },
        {
          id: 'packagePolicy3',
          namespaces: ['space'],
          attributes: {
            policy_ids: ['policy3'],
          },
        },
      ],
      page: 1,
      perPage: 100,
    });
    mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(
      mockSoClient
    );
    mockedAppContextService.getInternalUserSOClientForSpaceId.mockReturnValue(mockSoClient);
    mockGetPackagePolicySavedObjectType.mockResolvedValue('fleet-package-policies');
  });

  it('should update package policy if bump agent policy revision needed', async () => {
    const logger = loggingSystemMock.createLogger();

    await _updatePackagePoliciesThatNeedBump(logger, () => false);

    expect(mockSoClient.bulkUpdate).toHaveBeenCalledWith([
      {
        attributes: { bump_agent_policy_revision: false },
        id: 'packagePolicy1',
        type: 'fleet-package-policies',
      },
      {
        attributes: { bump_agent_policy_revision: false },
        id: 'packagePolicy12',
        type: 'fleet-package-policies',
      },
    ]);
    expect(mockSoClient.bulkUpdate).toHaveBeenCalledWith([
      {
        attributes: { bump_agent_policy_revision: false },
        id: 'packagePolicy2',
        type: 'fleet-package-policies',
      },
      {
        attributes: { bump_agent_policy_revision: false },
        id: 'packagePolicy3',
        type: 'fleet-package-policies',
      },
    ]);

    expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      ['policy1']
    );
    expect(mockedAgentPolicyService.bumpAgentPoliciesByIds).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      ['policy2', 'policy3']
    );
  });
});
