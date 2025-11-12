/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';

import type { Agent } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';
import { agentPolicyService } from '../agent_policy';
import { getPackageInfo } from '../epm/packages';

import { reassignAgent, reassignAgents } from './reassign';
import { createClientMock } from './action.mock';

jest.mock('../agent_policy');
jest.mock('../epm/packages');

describe('reassignAgent', () => {
  let mocks: ReturnType<typeof createClientMock>;

  beforeEach(async () => {
    mocks = createClientMock();

    appContextService.start(
      createAppContextStartContractMock({}, false, {
        internal: mocks.soClient,
        withoutSpaceExtensions: mocks.soClient,
      })
    );

    // Mock agentPolicyService.get to return the correct policies
    (agentPolicyService.get as jest.Mock).mockImplementation(
      async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
        const basePolicy = (() => {
          switch (id) {
            case mocks.regularAgentPolicySO.id:
              return {
                id: mocks.regularAgentPolicySO.id,
                ...(mocks.regularAgentPolicySO.attributes as any),
              };
            case mocks.regularAgentPolicySO2.id:
              return {
                id: mocks.regularAgentPolicySO2.id,
                ...(mocks.regularAgentPolicySO2.attributes as any),
              };
            case mocks.hostedAgentPolicySO.id:
              return {
                id: mocks.hostedAgentPolicySO.id,
                ...(mocks.hostedAgentPolicySO.attributes as any),
              };
            default:
              return null;
          }
        })();

        if (!basePolicy) {
          return null;
        }

        // If withPackagePolicies is true, add empty package_policies array
        if (withPackagePolicies) {
          return { ...basePolicy, package_policies: [] };
        }

        return basePolicy;
      }
    );

    // Mock agentPolicyService.getByIds for getHostedPolicies
    (agentPolicyService.getByIds as jest.Mock) = jest
      .fn()
      .mockImplementation(async (_soClient: any, ids: string[], _options?: any) => {
        return ids
          .map((policyId) => {
            switch (policyId) {
              case mocks.regularAgentPolicySO.id:
                return {
                  id: mocks.regularAgentPolicySO.id,
                  ...(mocks.regularAgentPolicySO.attributes as any),
                };
              case mocks.regularAgentPolicySO2.id:
                return {
                  id: mocks.regularAgentPolicySO2.id,
                  ...(mocks.regularAgentPolicySO2.attributes as any),
                };
              case mocks.hostedAgentPolicySO.id:
                return {
                  id: mocks.hostedAgentPolicySO.id,
                  ...(mocks.hostedAgentPolicySO.attributes as any),
                };
              default:
                return null;
            }
          })
          .filter(Boolean);
      });

    // Mock getInactivityTimeouts to return empty array
    (agentPolicyService.getInactivityTimeouts as jest.Mock) = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });
  describe('reassignAgent (singular)', () => {
    it('can reassign from regular agent policy to regular', async () => {
      const { soClient, esClient, agentInRegularDoc, regularAgentPolicySO } = mocks;
      await reassignAgent(soClient, esClient, agentInRegularDoc._id, regularAgentPolicySO.id);

      // calls ES update with correct values
      expect(esClient.update).toBeCalledTimes(1);
      const calledWith = esClient.update.mock.calls[0];
      expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
      expect((calledWith[0] as estypes.UpdateRequest)?.doc).toHaveProperty(
        'policy_id',
        regularAgentPolicySO.id
      );
    });

    it('cannot reassign from regular agent policy to hosted', async () => {
      const { soClient, esClient, agentInRegularDoc, hostedAgentPolicySO } = mocks;
      await expect(
        reassignAgent(soClient, esClient, agentInRegularDoc._id, hostedAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);

      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);
    });

    it('cannot reassign from hosted agent policy', async () => {
      const { soClient, esClient, agentInHostedDoc, hostedAgentPolicySO, regularAgentPolicySO } =
        mocks;
      await expect(
        reassignAgent(soClient, esClient, agentInHostedDoc._id, regularAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);

      await expect(
        reassignAgent(soClient, esClient, agentInHostedDoc._id, hostedAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);
    });

    it('update namespaces with reassign', async () => {
      const { soClient, esClient, agentInRegularDoc, regularAgentPolicySO } = mocks;

      await reassignAgent(soClient, esClient, agentInRegularDoc._id, regularAgentPolicySO.id);

      // calls ES update with correct values
      expect(esClient.update).toBeCalledTimes(1);
      const calledWith = esClient.update.mock.calls[0];
      expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
      expect((calledWith[0] as estypes.UpdateRequest)?.doc).toHaveProperty('namespaces', [
        'space1',
      ]);
    });
  });

  describe('reassignAgents (plural)', () => {
    it('agents in hosted policies are not updated', async () => {
      const {
        soClient,
        esClient,
        agentInRegularDoc,
        agentInHostedDoc,
        agentInHostedDoc2,
        regularAgentPolicySO2,
      } = mocks;

      esClient.search.mockResponse({
        hits: {
          hits: [agentInRegularDoc, agentInHostedDoc, agentInHostedDoc2],
        },
      } as any);

      // Reset the mock to use the default implementation (which returns empty package_policies)
      // This test uses force: true, so version checking is skipped anyway
      (agentPolicyService.get as jest.Mock).mockImplementation(
        async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
          const basePolicy = (() => {
            switch (id) {
              case mocks.regularAgentPolicySO.id:
                return {
                  id: mocks.regularAgentPolicySO.id,
                  ...(mocks.regularAgentPolicySO.attributes as any),
                };
              case mocks.regularAgentPolicySO2.id:
                return {
                  id: mocks.regularAgentPolicySO2.id,
                  ...(mocks.regularAgentPolicySO2.attributes as any),
                };
              case mocks.hostedAgentPolicySO.id:
                return {
                  id: mocks.hostedAgentPolicySO.id,
                  ...(mocks.hostedAgentPolicySO.attributes as any),
                };
              default:
                return null;
            }
          })();

          if (!basePolicy) {
            return null;
          }

          if (withPackagePolicies) {
            return { ...basePolicy, package_policies: [] };
          }

          return basePolicy;
        }
      );

      const idsToReassign = [agentInRegularDoc._id, agentInHostedDoc._id, agentInHostedDoc2._id];
      await reassignAgents(
        soClient,
        esClient,
        { agentIds: idsToReassign, force: true }, // Use force to skip version checking
        regularAgentPolicySO2.id
      );

      // calls ES update with correct values
      // Find the bulk call that contains the update for the regular agent (should be the first one)
      const updateBulkCall = esClient.bulk.mock.calls.find((call) => {
        const operations = (call[0] as estypes.BulkRequest).operations || [];
        return operations.some((op: any) => op?.update?._id === agentInRegularDoc._id);
      });
      expect(updateBulkCall).toBeDefined();
      const calledWith = updateBulkCall![0] as estypes.BulkRequest;
      // only 1 regular agent should be updated (bulk write two lines per update: update action + doc)
      // The hosted agents should be filtered out, so we should only have 2 operations total
      const updateOperations = calledWith.operations?.filter((op: any) => op?.update) || [];
      expect(updateOperations.length).toBe(1);
      expect((updateOperations[0] as any).update._id).toEqual(agentInRegularDoc._id);
      // Find the doc operation that follows the update
      const updateIndex =
        calledWith.operations?.findIndex((op: any) => op?.update?._id === agentInRegularDoc._id) ??
        -1;
      expect(updateIndex).toBeGreaterThanOrEqual(0);
      const docOperation = calledWith.operations?.[updateIndex + 1];
      expect(docOperation).toBeDefined();
      expect((docOperation as any)?.doc).toHaveProperty('namespaces', ['space1', 'default']);

      // hosted policy is updated in action results with error
      const calledWithActionResults =
        (esClient.bulk.mock.calls[1]?.[0] as estypes.BulkRequest) || ({} as estypes.BulkRequest);
      // bulk write two line per create
      expect(calledWithActionResults.operations?.length).toBe(4);
      const expectedObject = expect.objectContaining({
        '@timestamp': expect.anything(),
        action_id: expect.anything(),
        agent_id: 'agent-in-hosted-policy',
        error:
          'Cannot reassign an agent from hosted agent policy hosted-agent-policy in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
      });
      expect(calledWithActionResults.operations?.[1]).toEqual(expectedObject);
    });

    it('should report errors from ES agent update call', async () => {
      const { soClient, esClient, agentInRegularDoc, regularAgentPolicySO2 } = mocks;

      esClient.bulk.mockResponse({
        items: [
          {
            update: {
              _id: agentInRegularDoc._id,
              error: new Error('version conflict'),
            },
          },
        ],
      } as any);
      const idsToReassign = [agentInRegularDoc._id];
      await reassignAgents(
        soClient,
        esClient,
        { agentIds: idsToReassign },
        regularAgentPolicySO2.id
      );

      const calledWithActionResults =
        (esClient.bulk.mock.calls[1]?.[0] as estypes.BulkRequest) || ({} as estypes.BulkRequest);
      const expectedObject = expect.objectContaining({
        '@timestamp': expect.anything(),
        action_id: expect.anything(),
        agent_id: agentInRegularDoc._id,
        error: 'version conflict',
      });
      expect(calledWithActionResults.operations?.[1]).toEqual(expectedObject);
    });

    describe('version compatibility checking', () => {
      const mockAgentWithVersion = {
        id: 'agent-with-version',
        active: true,
        type: 'PERMANENT' as const,
        enrolled_at: '2023-01-01T00:00:00Z',
        agent: { id: 'agent-with-version', version: '8.11.0' },
        local_metadata: {
          elastic: { agent: { version: '8.11.0' } },
        },
        policy_id: 'regular-agent-policy', // Different from target policy
        packages: [],
      } as Agent;

      const mockAgentWithHigherVersion = {
        id: 'agent-with-higher-version',
        active: true,
        type: 'PERMANENT' as const,
        enrolled_at: '2023-01-01T00:00:00Z',
        agent: { id: 'agent-with-higher-version', version: '8.13.0' },
        local_metadata: {
          elastic: { agent: { version: '8.13.0' } },
        },
        policy_id: 'regular-agent-policy', // Different from target policy
        packages: [],
      } as Agent;

      beforeEach(() => {
        jest.clearAllMocks();
        (getPackageInfo as jest.Mock).mockClear();
        // Reset agentPolicyService.get to use the default implementation
        (agentPolicyService.get as jest.Mock).mockImplementation(
          async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
            const basePolicy = (() => {
              switch (id) {
                case mocks.regularAgentPolicySO.id:
                  return {
                    id: mocks.regularAgentPolicySO.id,
                    ...(mocks.regularAgentPolicySO.attributes as any),
                  };
                case mocks.regularAgentPolicySO2.id:
                  return {
                    id: mocks.regularAgentPolicySO2.id,
                    ...(mocks.regularAgentPolicySO2.attributes as any),
                  };
                case mocks.hostedAgentPolicySO.id:
                  return {
                    id: mocks.hostedAgentPolicySO.id,
                    ...(mocks.hostedAgentPolicySO.attributes as any),
                  };
                default:
                  return null;
              }
            })();

            if (!basePolicy) {
              return null;
            }

            // If withPackagePolicies is true, add empty package_policies array
            if (withPackagePolicies) {
              return { ...basePolicy, package_policies: [] };
            }

            return basePolicy;
          }
        );
        // Reset agentPolicyService.getByIds to use the default implementation
        // This is critical for getHostedPolicies to work correctly
        (agentPolicyService.getByIds as jest.Mock).mockReset();
        (agentPolicyService.getByIds as jest.Mock).mockImplementation(
          async (_soClient: any, ids: string[], _options?: any) => {
            return ids
              .map((policyId) => {
                switch (policyId) {
                  case mocks.regularAgentPolicySO.id:
                    return {
                      id: mocks.regularAgentPolicySO.id,
                      ...(mocks.regularAgentPolicySO.attributes as any),
                    };
                  case mocks.regularAgentPolicySO2.id:
                    return {
                      id: mocks.regularAgentPolicySO2.id,
                      ...(mocks.regularAgentPolicySO2.attributes as any),
                    };
                  case mocks.hostedAgentPolicySO.id:
                    return {
                      id: mocks.hostedAgentPolicySO.id,
                      ...(mocks.hostedAgentPolicySO.attributes as any),
                    };
                  default:
                    return null;
                }
              })
              .filter(Boolean);
          }
        );
      });

      it('should skip version checking when force is true', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        await reassignAgents(
          soClient,
          esClient,
          { agents: [mockAgentWithVersion], force: true },
          regularAgentPolicySO2.id
        );

        // Should call agentPolicyService.get twice: once for verifyNewAgentPolicy, once in reassignBatch
        expect(agentPolicyService.get).toHaveBeenCalledTimes(2);
        expect(getPackageInfo).not.toHaveBeenCalled();
      });

      it('should check version compatibility when force is false', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        // First call: verifyNewAgentPolicy
        // Second call: checkAgentVersionCompatibilityForReassign (withPackagePolicies: true)
        (agentPolicyService.get as jest.Mock)
          .mockResolvedValueOnce({
            id: regularAgentPolicySO2.id,
            is_managed: false,
          })
          .mockResolvedValueOnce({
            id: regularAgentPolicySO2.id,
            package_policies: [
              {
                id: 'pp-1',
                package: { name: 'test-package', version: '1.0.0' },
              },
            ],
          });

        (getPackageInfo as jest.Mock).mockResolvedValue({
          name: 'test-package',
          version: '1.0.0',
          conditions: { agent: { version: '>=8.12.0' } },
        });

        // Agent version 8.11.0 doesn't meet requirement 8.12.0, so it will be filtered out
        // and reassignBatch will throw because there are no agents to reassign
        await expect(
          reassignAgents(
            soClient,
            esClient,
            { agents: [mockAgentWithVersion], force: false },
            regularAgentPolicySO2.id
          )
        ).rejects.toThrow('No agents to reassign');

        // Should call agentPolicyService.get for version checking
        // verifyNewAgentPolicy + version check (reassignBatch not reached due to throw)
        expect(agentPolicyService.get).toHaveBeenCalledTimes(2);
        expect(getPackageInfo).toHaveBeenCalled();
      });

      it('should add version incompatibility errors to outgoingErrors', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        // Create a compatible agent to mix with incompatible one
        const compatibleAgent = {
          id: 'agent-compatible',
          active: true,
          type: 'PERMANENT' as const,
          enrolled_at: '2023-01-01T00:00:00Z',
          agent: { id: 'agent-compatible', version: '8.13.0' },
          local_metadata: {
            elastic: { agent: { version: '8.13.0' } },
          },
          policy_id: 'regular-agent-policy',
          packages: [],
        } as Agent;

        // Override the default implementation for this test
        (agentPolicyService.get as jest.Mock).mockImplementation(
          async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
            if (id === regularAgentPolicySO2.id) {
              const base = {
                id: regularAgentPolicySO2.id,
                ...(regularAgentPolicySO2.attributes as any),
              };
              if (withPackagePolicies) {
                return {
                  ...base,
                  package_policies: [
                    {
                      id: 'pp-1',
                      package: { name: 'test-package', version: '1.0.0' },
                    },
                  ],
                };
              }
              return base;
            }
            // Fall back to default implementation for other IDs (needed for getHostedPolicies)
            const basePolicy = (() => {
              switch (id) {
                case mocks.regularAgentPolicySO.id:
                  return {
                    ...mocks.regularAgentPolicySO.attributes,
                    id: mocks.regularAgentPolicySO.id,
                  };
                case mocks.regularAgentPolicySO2.id:
                  return {
                    ...mocks.regularAgentPolicySO2.attributes,
                    id: mocks.regularAgentPolicySO2.id,
                  };
                case mocks.hostedAgentPolicySO.id:
                  return {
                    ...mocks.hostedAgentPolicySO.attributes,
                    id: mocks.hostedAgentPolicySO.id,
                  };
                default:
                  return null;
              }
            })();
            return basePolicy;
          }
        );

        // Ensure getByIds is properly mocked for getHostedPolicies
        // This must be set up before reassignAgents is called
        (agentPolicyService.getByIds as jest.Mock).mockReset();
        (agentPolicyService.getByIds as jest.Mock).mockImplementation(
          async (_soClient: any, ids: string[], _options?: any) => {
            return ids
              .map((policyId) => {
                switch (policyId) {
                  case mocks.regularAgentPolicySO.id:
                    return {
                      id: mocks.regularAgentPolicySO.id,
                      ...(mocks.regularAgentPolicySO.attributes as any),
                    };
                  case mocks.regularAgentPolicySO2.id:
                    return {
                      id: mocks.regularAgentPolicySO2.id,
                      ...(mocks.regularAgentPolicySO2.attributes as any),
                    };
                  case mocks.hostedAgentPolicySO.id:
                    return {
                      id: mocks.hostedAgentPolicySO.id,
                      ...(mocks.hostedAgentPolicySO.attributes as any),
                    };
                  default:
                    return null;
                }
              })
              .filter(Boolean);
          }
        );

        (getPackageInfo as jest.Mock).mockResolvedValue({
          name: 'test-package',
          version: '1.0.0',
          conditions: { agent: { version: '>=8.12.0' } },
        });

        await reassignAgents(
          soClient,
          esClient,
          { agents: [mockAgentWithVersion, compatibleAgent], force: false },
          regularAgentPolicySO2.id
        );

        // Should create error action results for incompatible agent
        const calledWithActionResults = esClient.bulk.mock.calls[1]?.[0] as estypes.BulkRequest;
        expect(calledWithActionResults).toBeDefined();
        const errorResult = calledWithActionResults.operations?.[1] as any;
        expect(errorResult).toBeDefined();
        expect(errorResult.agent_id).toBe('agent-with-version');
        expect(errorResult.error).toContain('does not satisfy required version range');
      });

      it('should reassign agents that meet version requirements', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        // Override the default implementation for this test
        (agentPolicyService.get as jest.Mock).mockImplementation(
          async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
            if (id === regularAgentPolicySO2.id) {
              const base = {
                id: regularAgentPolicySO2.id,
                ...(regularAgentPolicySO2.attributes as any),
              };
              if (withPackagePolicies) {
                return {
                  ...base,
                  package_policies: [
                    {
                      id: 'pp-1',
                      package: { name: 'test-package', version: '1.0.0' },
                    },
                  ],
                };
              }
              return base;
            }
            // Fall back to default implementation for other IDs (needed for getHostedPolicies)
            const basePolicy = (() => {
              switch (id) {
                case mocks.regularAgentPolicySO.id:
                  return {
                    ...mocks.regularAgentPolicySO.attributes,
                    id: mocks.regularAgentPolicySO.id,
                  };
                case mocks.regularAgentPolicySO2.id:
                  return {
                    ...mocks.regularAgentPolicySO2.attributes,
                    id: mocks.regularAgentPolicySO2.id,
                  };
                case mocks.hostedAgentPolicySO.id:
                  return {
                    ...mocks.hostedAgentPolicySO.attributes,
                    id: mocks.hostedAgentPolicySO.id,
                  };
                default:
                  return null;
              }
            })();
            return basePolicy;
          }
        );

        // Ensure getByIds is properly mocked for getHostedPolicies
        // This must be set up before reassignAgents is called
        (agentPolicyService.getByIds as jest.Mock).mockReset();
        (agentPolicyService.getByIds as jest.Mock).mockImplementation(
          async (_soClient: any, ids: string[], _options?: any) => {
            return ids
              .map((policyId) => {
                switch (policyId) {
                  case mocks.regularAgentPolicySO.id:
                    return {
                      id: mocks.regularAgentPolicySO.id,
                      ...(mocks.regularAgentPolicySO.attributes as any),
                    };
                  case mocks.regularAgentPolicySO2.id:
                    return {
                      id: mocks.regularAgentPolicySO2.id,
                      ...(mocks.regularAgentPolicySO2.attributes as any),
                    };
                  case mocks.hostedAgentPolicySO.id:
                    return {
                      id: mocks.hostedAgentPolicySO.id,
                      ...(mocks.hostedAgentPolicySO.attributes as any),
                    };
                  default:
                    return null;
                }
              })
              .filter(Boolean);
          }
        );

        (getPackageInfo as jest.Mock).mockResolvedValue({
          name: 'test-package',
          version: '1.0.0',
          conditions: { agent: { version: '>=8.12.0' } },
        });

        await reassignAgents(
          soClient,
          esClient,
          { agents: [mockAgentWithHigherVersion], force: false },
          regularAgentPolicySO2.id
        );

        // Should call bulk update for compatible agent
        const calledWith = esClient.bulk.mock.calls[0]?.[0] as estypes.BulkRequest;
        expect(calledWith).toBeDefined();
        const updateOp = calledWith.operations?.[0] as { update?: { _id: string } };
        expect(updateOp?.update?._id).toBe('agent-with-higher-version');
      });

      it('should handle agents with no version gracefully', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        const agentWithoutVersion = {
          id: 'agent-without-version',
          active: true,
          type: 'PERMANENT' as const,
          enrolled_at: '2023-01-01T00:00:00Z',
          agent: {},
          local_metadata: {},
          policy_id: 'regular-agent-policy',
        } as Agent;

        // First call: verifyNewAgentPolicy
        // Second call: checkAgentVersionCompatibilityForReassign (withPackagePolicies: true)
        // Third call: reassignBatch (without withPackagePolicies)
        (agentPolicyService.get as jest.Mock)
          .mockResolvedValueOnce({
            id: regularAgentPolicySO2.id,
            is_managed: false,
          })
          .mockResolvedValueOnce({
            id: regularAgentPolicySO2.id,
            package_policies: [
              {
                id: 'pp-1',
                package: { name: 'test-package', version: '1.0.0' },
              },
            ],
          })
          .mockResolvedValueOnce({
            id: regularAgentPolicySO2.id,
            is_managed: false,
          });

        (getPackageInfo as jest.Mock).mockResolvedValue({
          name: 'test-package',
          version: '1.0.0',
          conditions: { agent: { version: '>=8.12.0' } },
        });

        await reassignAgents(
          soClient,
          esClient,
          { agents: [agentWithoutVersion], force: false },
          regularAgentPolicySO2.id
        );

        // Should still attempt to reassign (no version means no check)
        // verifyNewAgentPolicy + version check + reassignBatch
        expect(agentPolicyService.get).toHaveBeenCalledTimes(3);
      });

      it('should handle multiple agents with mixed compatibility', async () => {
        const { soClient, esClient, regularAgentPolicySO2 } = mocks;

        // Override the default implementation for this test
        (agentPolicyService.get as jest.Mock).mockImplementation(
          async (_soClient: any, id: string, withPackagePolicies?: boolean) => {
            if (id === regularAgentPolicySO2.id) {
              const base = {
                id: regularAgentPolicySO2.id,
                ...(regularAgentPolicySO2.attributes as any),
              };
              if (withPackagePolicies) {
                return {
                  ...base,
                  package_policies: [
                    {
                      id: 'pp-1',
                      package: { name: 'test-package', version: '1.0.0' },
                    },
                  ],
                };
              }
              return base;
            }
            // Fall back to default implementation for other IDs (needed for getHostedPolicies)
            const basePolicy = (() => {
              switch (id) {
                case mocks.regularAgentPolicySO.id:
                  return {
                    ...mocks.regularAgentPolicySO.attributes,
                    id: mocks.regularAgentPolicySO.id,
                  };
                case mocks.regularAgentPolicySO2.id:
                  return {
                    ...mocks.regularAgentPolicySO2.attributes,
                    id: mocks.regularAgentPolicySO2.id,
                  };
                case mocks.hostedAgentPolicySO.id:
                  return {
                    ...mocks.hostedAgentPolicySO.attributes,
                    id: mocks.hostedAgentPolicySO.id,
                  };
                default:
                  return null;
              }
            })();
            return basePolicy;
          }
        );

        // Ensure getByIds is properly mocked for getHostedPolicies
        // This must be set up before reassignAgents is called
        (agentPolicyService.getByIds as jest.Mock).mockReset();
        (agentPolicyService.getByIds as jest.Mock).mockImplementation(
          async (_soClient: any, ids: string[], _options?: any) => {
            return ids
              .map((policyId) => {
                switch (policyId) {
                  case mocks.regularAgentPolicySO.id:
                    return {
                      id: mocks.regularAgentPolicySO.id,
                      ...(mocks.regularAgentPolicySO.attributes as any),
                    };
                  case mocks.regularAgentPolicySO2.id:
                    return {
                      id: mocks.regularAgentPolicySO2.id,
                      ...(mocks.regularAgentPolicySO2.attributes as any),
                    };
                  case mocks.hostedAgentPolicySO.id:
                    return {
                      id: mocks.hostedAgentPolicySO.id,
                      ...(mocks.hostedAgentPolicySO.attributes as any),
                    };
                  default:
                    return null;
                }
              })
              .filter(Boolean);
          }
        );

        (getPackageInfo as jest.Mock).mockResolvedValue({
          name: 'test-package',
          version: '1.0.0',
          conditions: { agent: { version: '>=8.12.0' } },
        });

        await reassignAgents(
          soClient,
          esClient,
          { agents: [mockAgentWithVersion, mockAgentWithHigherVersion], force: false },
          regularAgentPolicySO2.id
        );

        // Should reassign compatible agent and add error for incompatible one
        const calledWith = esClient.bulk.mock.calls[0]?.[0] as estypes.BulkRequest;
        expect(calledWith).toBeDefined();
        // Only the compatible agent should be in the bulk update
        // The operations array has [update action, update doc] pairs, so index 0 is the update action
        const updateOperation = calledWith.operations?.[0] as { update?: { _id: string } };
        expect(updateOperation?.update?._id).toBe('agent-with-higher-version');

        // Should also have error action results for the incompatible agent
        const calledWithActionResults = esClient.bulk.mock.calls[1]?.[0] as estypes.BulkRequest;
        expect(calledWithActionResults).toBeDefined();
        const errorResult = calledWithActionResults.operations?.[1] as any;
        expect(errorResult).toBeDefined();
        expect(errorResult.agent_id).toBe('agent-with-version');
        expect(errorResult.error).toContain('does not satisfy required version range');
      });
    });
  });
});
