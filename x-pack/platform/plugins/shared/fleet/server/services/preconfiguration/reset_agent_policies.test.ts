/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked, MockedFunction } from 'vitest';

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { agentPolicyService, getAgentPolicySavedObjectType } from '../agent_policy';
import { packagePolicyService, getPackagePolicySavedObjectType } from '../package_policy';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../../constants';
import { setupFleet } from '../setup';
import { getAgentsByKuery, forceUnenrollAgent } from '../agents';
import { listEnrollmentApiKeys, deleteEnrollmentApiKeys } from '../api_keys';

import { resetPreconfiguredAgentPolicies } from './reset_agent_policies';

vi.mock('../agent_policy');
vi.mock('../package_policy');
vi.mock('../setup');
vi.mock('../agents');
vi.mock('../api_keys');

const mockedSetupFleet = setupFleet as MockedFunction<typeof setupFleet>;
const mockedForceUnenrollAgent = forceUnenrollAgent as MockedFunction<
  typeof forceUnenrollAgent
>;
const mockedDeleteEnrollmentApiKeys = deleteEnrollmentApiKeys as MockedFunction<
  typeof deleteEnrollmentApiKeys
>;
const mockedGetAgentsByKuery = getAgentsByKuery as MockedFunction<typeof getAgentsByKuery>;
const mockedListEnrollmentApiKeys = listEnrollmentApiKeys as MockedFunction<
  typeof listEnrollmentApiKeys
>;

const mockedAgentPolicyService = agentPolicyService as Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as Mocked<typeof packagePolicyService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as MockedFunction<
  typeof getAgentPolicySavedObjectType
>;
const mockedGetPackagePolicySavedObjectType =
  getPackagePolicySavedObjectType as MockedFunction<typeof getPackagePolicySavedObjectType>;

vi.mock('../app_context', () => {
      const mocked = {
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
                          return vi.fn();
                        },
                      }
                    );
                }

                return vi.fn();
              },
            }
          ),
      },
    };
      return { ...mocked, default: mocked };
    });

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

    expect(mockedSetupFleet).toHaveBeenCalled();
    expect(mockedForceUnenrollAgent).not.toHaveBeenCalled();
    expect(mockedDeleteEnrollmentApiKeys).not.toHaveBeenCalled();
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

    expect(mockedSetupFleet).toHaveBeenCalled();
    expect(mockedForceUnenrollAgent).toHaveBeenCalled();
    expect(mockedDeleteEnrollmentApiKeys).toHaveBeenCalled();
  });

  describe('_deleteGhostPackagePolicies with legacy (non-space-aware) saved object types', () => {
    beforeEach(() => {
      vi.clearAllMocks();
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

      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'policy1', type: 'ingest-agent-policies' },
      ]);
      expect(soClient.delete).not.toHaveBeenCalled();
      expect(mockedSetupFleet).toHaveBeenCalled();
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

      expect(soClient.delete).toHaveBeenCalledWith('ingest-package-policies', 'pkgPolicy1');
      expect(mockedSetupFleet).toHaveBeenCalled();
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

      expect(mockedSetupFleet).toHaveBeenCalled();
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

      expect(mockedSetupFleet).not.toHaveBeenCalled();
    });
  });
});
