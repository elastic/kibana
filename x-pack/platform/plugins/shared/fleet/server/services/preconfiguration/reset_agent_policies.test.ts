/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { agentPolicyService, getAgentPolicySavedObjectType } from '../agent_policy';
import { packagePolicyService, getPackagePolicySavedObjectType } from '../package_policy';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../../constants';
import { setupFleet } from '../setup';
import { getAgentsByKuery, forceUnenrollAgent } from '../agents';
import { listEnrollmentApiKeys, deleteEnrollmentApiKeys } from '../api_keys';

import { resetPreconfiguredAgentPolicies } from './reset_agent_policies';

jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../setup');
jest.mock('../agents');
jest.mock('../api_keys');

const mockedSetupFleet = setupFleet as jest.MockedFunction<typeof setupFleet>;
const mockedForceUnenrollAgent = forceUnenrollAgent as jest.MockedFunction<
  typeof forceUnenrollAgent
>;
const mockedDeleteEnrollmentApiKeys = deleteEnrollmentApiKeys as jest.MockedFunction<
  typeof deleteEnrollmentApiKeys
>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedListEnrollmentApiKeys = listEnrollmentApiKeys as jest.MockedFunction<
  typeof listEnrollmentApiKeys
>;

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as jest.MockedFunction<
  typeof getAgentPolicySavedObjectType
>;
const mockedGetPackagePolicySavedObjectType =
  getPackagePolicySavedObjectType as jest.MockedFunction<typeof getPackagePolicySavedObjectType>;

jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: () =>
      new Proxy(
        {},
        {
          get(_, property) {
            if (property === 'get') {
              return () =>
                new Proxy(
                  {},
                  {
                    get() {
                      return jest.fn();
                    },
                  }
                );
            }

            return jest.fn();
          },
        }
      ),
  },
}));

describe('reset agent policies', () => {
  it('should not unenroll agents or revoke enrollment api keys if there is no existing policies', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockedAgentPolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    soClient.find.mockImplementation(async (option) => {
      if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
        return { saved_objects: [] } as any;
      }

      throw new Error('not mocked');
    });
    await resetPreconfiguredAgentPolicies(soClient, esClient);

    expect(mockedSetupFleet).toBeCalled();
    expect(mockedForceUnenrollAgent).not.toBeCalled();
    expect(mockedDeleteEnrollmentApiKeys).not.toBeCalled();
  });

  it('should unenroll agents and revoke enrollment api keys if there is policies', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockedAgentPolicyService.list.mockResolvedValueOnce({
      items: [{ id: 'policy1' }],
    } as any);
    mockedPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
    } as any);
    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [{ id: 'agent1' }],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValueOnce({
      items: [{ id: 'key1' }],
    } as any);
    soClient.find.mockImplementation(async (option) => {
      if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
        return {
          saved_objects: [],
        } as any;
      }

      throw new Error('not mocked');
    });
    await resetPreconfiguredAgentPolicies(soClient, esClient);

    expect(mockedSetupFleet).toBeCalled();
    expect(mockedForceUnenrollAgent).toBeCalled();
    expect(mockedDeleteEnrollmentApiKeys).toBeCalled();
  });

  describe('_deleteGhostPackagePolicies with legacy (non-space-aware) saved object types', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedGetAgentPolicySavedObjectType.mockResolvedValue('ingest-agent-policies');
      mockedGetPackagePolicySavedObjectType.mockResolvedValue('ingest-package-policies');
      mockedAgentPolicyService.list.mockResolvedValueOnce({ items: [] } as any);
    });

    it('should resolve the legacy agent policy type and not delete a package policy whose parent agent policy exists', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedPackagePolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'pkgPolicy1', name: 'pkgPolicy1', policy_ids: ['policy1'] }],
      } as any);
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [{ id: 'policy1', type: 'ingest-agent-policies', attributes: {} }],
      } as any);
      soClient.find.mockImplementation(async (option) => {
        if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
          return { saved_objects: [] } as any;
        }
        throw new Error('not mocked');
      });

      await resetPreconfiguredAgentPolicies(soClient, esClient);

      expect(soClient.bulkGet).toBeCalledWith([{ id: 'policy1', type: 'ingest-agent-policies' }]);
      expect(soClient.delete).not.toBeCalled();
      expect(mockedSetupFleet).toBeCalled();
    });

    it('should delete a ghost package policy using the resolved legacy package policy type', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedPackagePolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'pkgPolicy1', name: 'pkgPolicy1', policy_ids: ['policy1'] }],
      } as any);
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy1',
            type: 'ingest-agent-policies',
            error: { statusCode: 404, message: 'Not found', error: 'Not Found' },
          },
        ],
      } as any);
      soClient.delete.mockResolvedValueOnce(undefined as any);
      soClient.find.mockImplementation(async (option) => {
        if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
          return { saved_objects: [] } as any;
        }
        throw new Error('not mocked');
      });

      await resetPreconfiguredAgentPolicies(soClient, esClient);

      expect(soClient.delete).toBeCalledWith('ingest-package-policies', 'pkgPolicy1');
      expect(mockedSetupFleet).toBeCalled();
    });

    it('should not abort the reset when deleting a ghost package policy 404s', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedPackagePolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'pkgPolicy1', name: 'pkgPolicy1', policy_ids: ['policy1'] }],
      } as any);
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy1',
            type: 'ingest-agent-policies',
            error: { statusCode: 404, message: 'Not found', error: 'Not Found' },
          },
        ],
      } as any);
      soClient.delete.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('ingest-package-policies', 'pkgPolicy1')
      );
      soClient.find.mockImplementation(async (option) => {
        if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
          return { saved_objects: [] } as any;
        }
        throw new Error('not mocked');
      });

      await expect(resetPreconfiguredAgentPolicies(soClient, esClient)).resolves.not.toThrow();

      expect(mockedSetupFleet).toBeCalled();
    });

    it('should propagate non-404 errors from deleting a ghost package policy', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedPackagePolicyService.list.mockResolvedValueOnce({
        items: [{ id: 'pkgPolicy1', name: 'pkgPolicy1', policy_ids: ['policy1'] }],
      } as any);
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy1',
            type: 'ingest-agent-policies',
            error: { statusCode: 404, message: 'Not found', error: 'Not Found' },
          },
        ],
      } as any);
      soClient.delete.mockRejectedValueOnce(new Error('boom'));
      soClient.find.mockImplementation(async (option) => {
        if (option.type === PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE) {
          return { saved_objects: [] } as any;
        }
        throw new Error('not mocked');
      });

      await expect(resetPreconfiguredAgentPolicies(soClient, esClient)).rejects.toThrow('boom');

      expect(mockedSetupFleet).not.toBeCalled();
    });
  });
});
