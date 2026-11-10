/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { merge } from 'lodash';

import type { NewAgentAction, AgentActionType } from '../../../common/types';
import { createAppContextStartContractMock, type MockedFleetAppContext } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';

import { agentPolicyService } from '../agent_policy';

import { SCHEDULED_UNENROLL_ACTION_ID_PREFIX } from '../../../common/constants';

import {
  bulkCreateAgentActionResults,
  bulkCreateAgentActions,
  cancelAgentAction,
  createAgentAction,
  collectAgentIdsFromActions,
  getAgentsByActionsIds,
  getAgentsWithoutActionResults,
  transformDataSecrets,
} from './actions';

import { bulkUpdateAgents } from './crud';

jest.mock('./crud');
jest.mock('../audit_logging');
jest.mock('../agent_policy');
jest.mock('../secrets', () => ({
  isActionSecretStorageEnabled: jest.fn(),
  toCompiledSecretRef: jest.fn((id: string) => `$co.elastic.secret{${id}}`),
}));

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const mockedBulkUpdateAgents = bulkUpdateAgents as jest.MockedFunction<typeof bulkUpdateAgents>;
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('Agent actions', () => {
  let mockContext: MockedFleetAppContext;

  beforeEach(async () => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
  });

  afterEach(() => {
    appContextService.stop();
    mockedAuditLoggingService.writeCustomAuditLog.mockReset();
  });

  describe('getAgentActions', () => {
    it('should call audit logger', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action1',
                agents: ['agent1'],
                expiration: new Date().toISOString(),
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);

      await getAgentsByActionsIds(esClientMock, ['action1']);

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User retrieved Fleet action [id=action1]`,
      });
    });
  });

  describe('createAgentAction', () => {
    beforeEach(() => {
      mockContext.messageSigningService.sign = jest
        .fn()
        .mockImplementation((message: Record<string, unknown>) =>
          Promise.resolve({
            data: Buffer.from(JSON.stringify(message), 'utf8'),
            signature: 'thisisasignature',
          })
        );
    });

    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: 'UPGRADE',
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: new Date().toISOString(),
              },
            },
          ],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();

      await createAgentAction(esClient, soClient, {
        id: 'action1',
        type: 'UPGRADE',
        agents: ['agent1'],
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: expect.stringMatching(/User created Fleet action/),
      });
    });

    it.each(['UNENROLL', 'UPGRADE', 'MIGRATE', 'RESTART'] as AgentActionType[])(
      'should sign %s action',
      async (actionType: AgentActionType) => {
        const esClient = elasticsearchServiceMock.createInternalClient();
        esClient.search.mockResolvedValue({
          hits: {
            hits: [
              {
                _source: {
                  type: actionType,
                  action_id: 'action1',
                  agents: ['agent1', 'agent2'],
                  expiration: new Date().toISOString(),
                },
              },
            ],
          },
        } as any);
        const soClient = savedObjectsClientMock.create();

        await createAgentAction(esClient, soClient, {
          id: 'action1',
          type: actionType,
          agents: ['agent1'],
        });

        expect(esClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            document: expect.objectContaining({
              signed: {
                data: expect.any(String),
                signature: expect.any(String),
              },
            }),
          })
        );
      }
    );

    it.each([
      'SETTINGS',
      'POLICY_REASSIGN',
      'CANCEL',
      'FORCE_UNENROLL',
      'UPDATE_TAGS',
      'REQUEST_DIAGNOSTICS',
      'POLICY_CHANGE',
      'INPUT_ACTION',
    ] as AgentActionType[])('should not sign %s action', async (actionType: AgentActionType) => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: actionType,
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: new Date().toISOString(),
              },
            },
          ],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();

      await createAgentAction(esClient, soClient, {
        id: 'action1',
        type: actionType,
        agents: ['agent1'],
      });

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.not.objectContaining({
            signed: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('bulkCreateAgentAction', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();

      const newActions: NewAgentAction[] = [
        {
          id: 'action1',
          type: 'UPGRADE',
          agents: ['agent1'],
        },
        {
          id: 'action2',
          type: 'UPGRADE',
          agents: ['agent2'],
        },
        {
          id: 'action3',
          type: 'UPGRADE',
          agents: ['agent3'],
        },
      ];

      await bulkCreateAgentActions(esClient, newActions);

      for (const action of newActions) {
        expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
          message: `User created Fleet action [id=${action.id}]`,
        });
      }
    });

    it.each(['UNENROLL', 'UPGRADE', 'MIGRATE', 'RESTART'] as AgentActionType[])(
      'should sign %s action',
      async (actionType: AgentActionType) => {
        const esClient = elasticsearchServiceMock.createInternalClient();

        await bulkCreateAgentActions(esClient, [
          { id: 'action1', type: actionType, agents: ['agent1'] },
        ]);

        expect(esClient.bulk).toHaveBeenCalledWith(
          expect.objectContaining({
            operations: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  type: actionType,
                  signed: {
                    data: expect.any(String),
                    signature: expect.any(String),
                  },
                }),
              ]),
            ]),
          })
        );
      }
    );

    it('should not sign actions other than UNENROLL, UPGRADE, MIGRATE and RESTART', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      const newActions: NewAgentAction[] = (
        [
          'SETTINGS',
          'POLICY_REASSIGN',
          'CANCEL',
          'FORCE_UNENROLL',
          'UPDATE_TAGS',
          'REQUEST_DIAGNOSTICS',
          'POLICY_CHANGE',
          'INPUT_ACTION',
        ] as AgentActionType[]
      ).map((actionType, i) => {
        const actionId = `action${i + 1}`;
        return {
          id: actionId,
          type: actionType,
          agents: [actionId],
        };
      });

      await bulkCreateAgentActions(esClient, newActions);
      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.arrayContaining([
              expect.not.objectContaining({
                signed: {
                  data: expect.any(String),
                  signature: expect.any(String),
                },
              }),
            ]),
          ]),
        })
      );
    });
  });

  describe('bulkCreateAgentActionResults', () => {
    it('should call audit logger', async () => {
      const mockEsClient = elasticsearchServiceMock.createInternalClient();

      await bulkCreateAgentActionResults(mockEsClient, [
        {
          actionId: 'action1',
          agentId: 'agent1',
        },
      ]);

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User created Fleet action result [id=action1]`,
      });
    });
  });

  describe('cancelAgentAction', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw if the target action is not found', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();
      await expect(() => cancelAgentAction(esClient, soClient, 'i-do-not-exists')).rejects.toThrow(
        /Action not found/
      );
    });

    it('should create one CANCEL action for each UPGRADE action found', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
            {
              _source: {
                action_id: 'action1',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'action1');

      expect(esClient.create).toHaveBeenCalledTimes(2);
      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'action1' },
            agents: ['agent1', 'agent2'],
          }),
        })
      );
      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'action1' },
            agents: ['agent3', 'agent4'],
          }),
        })
      );
    });

    it('should cancel UPGRADE action', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: 'UPGRADE',
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: '2022-05-12T18:16:18.019Z',
              },
            },
          ],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'action1');

      expect(mockedBulkUpdateAgents).toHaveBeenCalled();
      expect(mockedBulkUpdateAgents).toHaveBeenCalledWith(
        expect.anything(),
        [
          expect.objectContaining({ agentId: 'agent1' }),
          expect.objectContaining({ agentId: 'agent2' }),
        ],
        {}
      );
    });

    it('should create a CANCEL action for a scheduled UNENROLL action', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      // 1: find UNENROLL action
      // 2: look up agent policy_ids from .fleet-agents
      // 3: concurrent-batch re-query
      // 4: look up other pending scheduled UNENROLL batches (cancelPendingBatches)
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'unenroll-action-1',
                  agents: ['agent1', 'agent2'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [{ _source: { policy_id: 'policy-1' } }, { _source: { policy_id: 'policy-1' } }],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'unenroll-action-1',
                  agents: ['agent1', 'agent2'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any); // no other pending batches

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});

      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'unenroll-action-1');

      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'unenroll-action-1' },
            agents: ['agent1', 'agent2'],
          }),
        })
      );
    });

    it('should NOT call bulkUpdateAgents (updateAgentsToHealthy) when cancelling UNENROLL', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'unenroll-action-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any) // agent policy lookup (no policy_id found)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'unenroll-action-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                },
              },
            ],
          },
        } as any);
      // No policy IDs found so cancel-other-batches step is skipped (no searches 4/5)

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});

      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'unenroll-action-1');

      expect(mockedBulkUpdateAgents).not.toHaveBeenCalled();
    });

    it('should disable unenroll_timeout on the agent policy when cancelling UNENROLL', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      const scheduledActionId = `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}test-action-1`;
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: scheduledActionId,
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { policy_id: 'policy-abc' } }] },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: scheduledActionId,
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({ hits: { hits: [] } } as any); // no other pending batches

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});

      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, scheduledActionId);

      expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
        soClient,
        expect.anything(),
        'policy-abc',
        { unenroll_timeout: 0 }
      );
    });

    it('should cancel other pending scheduled UNENROLL batches for the same policy', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'ScheduledUnenrollInactiveAgents-batch-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { policy_id: 'policy-abc' } }] },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'ScheduledUnenrollInactiveAgents-batch-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  // batch-2 shares agent1 with batch-1, so the in-memory intersection matches
                  action_id: 'ScheduledUnenrollInactiveAgents-batch-2',
                  agents: ['agent1', 'agent2'],
                  expiration: '2099-05-12T18:16:18.019Z',
                  start_time: '2099-05-12T18:00:00.000Z',
                },
              },
            ],
          },
        } as any); // another pending batch for same policy

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});

      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'ScheduledUnenrollInactiveAgents-batch-1');

      // Should have created two CANCEL actions: one for batch-1, one for batch-2
      expect(esClient.create).toHaveBeenCalledTimes(2);
      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'ScheduledUnenrollInactiveAgents-batch-2' },
          }),
        })
      );
    });

    it('should NOT call cancelPendingBatches or agentPolicyService.update when cancelling a manual (non-prefixed) UNENROLL', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      // 1: find UNENROLL action (non-prefixed action_id — manual unenrollment)
      // 2: agent policy lookup
      // 3: concurrent-batch re-query
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'manual-unenroll-action-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { policy_id: 'policy-abc' } }] },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  type: 'UNENROLL',
                  action_id: 'manual-unenroll-action-1',
                  agents: ['agent1'],
                  expiration: '2099-05-12T18:16:18.019Z',
                },
              },
            ],
          },
        } as any);
      // No searches 4/5 — cancelPendingBatches must NOT be called

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});
      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'manual-unenroll-action-1');

      // CANCEL action is still created (cancellation itself works)
      expect(esClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'manual-unenroll-action-1' },
          }),
        })
      );
      // Side effects are skipped because the action ID lacks the scheduled prefix
      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
      // Only 3 searches (find action, policy lookup, concurrent re-query) — no cancelPendingBatches searches
      expect(esClient.search).toHaveBeenCalledTimes(3);
    });

    it('should NOT call agentPolicyService.update when cancelling UPGRADE', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: 'UPGRADE',
                action_id: 'action1',
                agents: ['agent1'],
                expiration: '2022-05-12T18:16:18.019Z',
              },
            },
          ],
        },
      } as any);

      mockedAgentPolicyService.update = jest.fn().mockResolvedValue({});
      const soClient = savedObjectsClientMock.create();
      await cancelAgentAction(esClient, soClient, 'action1');

      expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
    });
  });

  describe('getAgentsByActionsIds', () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

    it('should find agents by passing actions Ids', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action2',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);
      const actionsIds = ['action2'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual(['agent3', 'agent4']);
    });

    it('should find agents by passing multiple actions Ids', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action2',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
            {
              _source: {
                action_id: 'action3',
                agents: ['agent5', 'agent6', 'agent7'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UNENROLL',
              },
            },
          ],
        },
      } as any);
      const actionsIds = ['action2', 'actions3'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual([
        'agent3',
        'agent4',
        'agent5',
        'agent6',
        'agent7',
      ]);
    });

    it('should find agents assigned to agent policies when passing agent policy action ids', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'agent1',
            },
            {
              _id: 'agent2',
            },
          ],
        },
      } as any);
      const actionsIds = ['action1:1'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual(['agent1', 'agent2']);
    });

    it('should find agents when passing both agent action and agent policy action ids', async () => {
      esClientMock.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  action_id: 'action2',
                  agents: ['agent3', 'agent4'],
                  expiration: '2022-05-12T18:16:18.019Z',
                  type: 'UPGRADE',
                },
              },
              {
                _source: {
                  action_id: 'action3',
                  agents: ['agent5', 'agent6', 'agent7'],
                  expiration: '2022-05-12T18:16:18.019Z',
                  type: 'UNENROLL',
                },
              },
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'agent1',
              },
              {
                _id: 'agent2',
              },
            ],
          },
        } as any);

      const actionsIds = ['action1:1', 'action2', 'actions3'];

      // policy changes are processed second
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual([
        'agent3',
        'agent4',
        'agent5',
        'agent6',
        'agent7',
        'agent1',
        'agent2',
      ]);
    });

    it('should return an empty array if no actions were found', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);
      const actionsIds = ['action1:1', 'action2'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual([]);
    });

    it('should find agents by passing actions Ids by querying actions results', async () => {
      esClientMock.search.mockImplementation((params: any) =>
        params.index === '.fleet-actions'
          ? ({
              hits: {
                hits: [
                  {
                    _source: {
                      action_id: 'action2',
                      agents: ['agent3'],
                      total: 2,
                      expiration: '2022-05-12T18:16:18.019Z',
                      type: 'UPGRADE',
                    },
                  },
                ],
              },
            } as any)
          : {
              hits: {
                hits: [
                  {
                    _source: {
                      agent_id: 'agent4',
                    },
                  },
                ],
              },
            }
      );
      const actionsIds = ['action2'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual(['agent3', 'agent4']);
    });
  });

  describe('transformDataSecrets', () => {
    it('should transform secret references from {id: string} to $co.elastic.secret{id}', () => {
      const testAction: NewAgentAction = {
        type: 'PRIVILEGE_LEVEL_CHANGE',
        agents: ['agent1'],
        data: {
          user_info: {
            username: 'user1',
            groupname: 'group1',
          },
        },
        secrets: {
          user_info: {
            password: {
              id: 'passwordref1',
            },
          },
        },
      };
      const testMergedData = merge(testAction.data, testAction.secrets);
      expect(transformDataSecrets(testMergedData)).toEqual({
        user_info: {
          username: 'user1',
          groupname: 'group1',
          password: '$co.elastic.secret{passwordref1}',
        },
      });
    });
  });

  describe('bulkCreateAgentActionResults refused items', () => {
    const okResponse = { errors: false, items: [] };
    const results = [
      { actionId: 'action1', agentId: 'agent1' },
      { actionId: 'action1', agentId: 'agent2' },
    ];

    it('writes nothing when there is nothing to write', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      await bulkCreateAgentActionResults(esClientMock, []);

      expect(esClientMock.bulk).not.toHaveBeenCalled();
    });

    it('writes the refused items again rather than only logging them', async () => {
      // an action counting an agent whose result never arrived waits for it forever, and a refused
      // item indexed nothing, so rewriting it cannot produce a second result for that agent
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.bulk
        .mockResolvedValueOnce({
          errors: true,
          items: [{ create: {} }, { create: { status: 429, error: { reason: 'rejected' } } }],
        } as any)
        .mockResolvedValueOnce(okResponse as any);

      await bulkCreateAgentActionResults(esClientMock, results);

      expect(esClientMock.bulk).toHaveBeenCalledTimes(2);
      // only the one that did not land
      const retried = (esClientMock.bulk.mock.calls[1][0] as any).operations;
      expect(retried).toHaveLength(2);
      expect(retried[1].agent_id).toEqual('agent2');
      expect(mockContext.logger.error).not.toHaveBeenCalled();
    });

    it('gives up after a bounded number of attempts, waiting in between', async () => {
      jest.useFakeTimers();
      try {
        const esClientMock = elasticsearchServiceMock.createInternalClient();
        esClientMock.bulk.mockResolvedValue({
          errors: true,
          items: [{ create: { status: 429, error: { reason: 'rejected' } } }, { create: {} }],
        } as any);

        const written = bulkCreateAgentActionResults(esClientMock, results);
        await jest.advanceTimersByTimeAsync(60_000);
        await written;

        // what gets an item refused rather than the whole request is a full write queue, which
        // milliseconds will not have cleared
        expect(esClientMock.bulk).toHaveBeenCalledTimes(3);
        expect(mockContext.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to write 1 of 2 agent action results, for agents agent1')
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not write the whole bulk again when it throws', async () => {
      // every item carries a freshly generated id, so this write is not idempotent and the
      // failures a transient retry covers are the ones that reach it with the bulk already
      // indexed; replaying the batch under a new action id is what keeps results from colliding
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.bulk.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));

      await expect(bulkCreateAgentActionResults(esClientMock, results)).rejects.toThrow(
        'Request timed out'
      );
      expect(esClientMock.bulk).toHaveBeenCalledTimes(1);
    });

    it('does not write an item again that Elasticsearch will refuse again', async () => {
      // a mapping failure cannot succeed on a second attempt, so another one is only load on a
      // cluster that is already struggling
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.bulk.mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 400, error: { reason: 'mapper_parsing_exception' } } },
          { create: {} },
        ],
      } as any);

      await bulkCreateAgentActionResults(esClientMock, results);

      expect(esClientMock.bulk).toHaveBeenCalledTimes(1);
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write 1 of 2 agent action results, for agents agent1')
      );
    });

    it('does not throw when items are refused', async () => {
      // failing the batch would have the retry rewrite the results that did land, under a new
      // action id, while the action they belong to stayed short either way
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.bulk.mockResolvedValue({
        errors: true,
        items: [{ create: { status: 400, error: { reason: 'rejected' } } }, { create: {} }],
      } as any);

      await expect(bulkCreateAgentActionResults(esClientMock, results)).resolves.toBeUndefined();
    });
  });

  describe('collectAgentIdsFromActions', () => {
    const mockHits = (agentIds: string[][]) => ({
      hits: { hits: agentIds.map((agents) => ({ _source: { agents } })) },
    });

    /** Collects into a fresh set, the way a first read does. */
    const collect = async (
      esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>,
      actionIds: string[],
      options?: Parameters<typeof collectAgentIdsFromActions>[3]
    ) => {
      const agentIds = new Set<string>();
      await collectAgentIdsFromActions(esClientMock, actionIds, agentIds, options);
      return agentIds;
    };

    it('reads nothing without an action id', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      await expect(collect(esClientMock, [])).resolves.toEqual(new Set());
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('collects the agents of every document of every action id given', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue(
        mockHits([['agent1', 'agent2'], ['agent2', 'agent3'], []]) as any
      );

      await expect(collect(esClientMock, ['action1', 'child1'])).resolves.toEqual(
        new Set(['agent1', 'agent2', 'agent3'])
      );
      // a missing .fleet-actions means nothing has been actioned, not a 404: Fleet Server creates
      // the index, so a deployment whose first ever action fails early does not have it yet
      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          ignore_unavailable: true,
          query: { bool: { filter: [{ terms: { action_id: ['action1', 'child1'] } }] } },
        })
      );
    });

    it('adds to the set it is given rather than replacing it', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue(mockHits([['agent2']]) as any);
      const agentIds = new Set(['agent1']);

      await collectAgentIdsFromActions(esClientMock, ['action1'], agentIds);

      expect(agentIds).toEqual(new Set(['agent1', 'agent2']));
    });

    it('does not spend a top-up budget on ids the caller already has', async () => {
      // the refresh window overlaps by design, so most of what a top-up reads is already there;
      // charging those against a budget of their own would stop the paging before the new ones
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue(mockHits([['known1', 'known2', 'new1']]) as any);
      const agentIds = new Set(['known1', 'known2']);

      await collectAgentIdsFromActions(esClientMock, ['action1'], agentIds, { limit: 3 });

      expect(agentIds).toEqual(new Set(['known1', 'known2', 'new1']));
    });

    it('restricts the read to recent documents when asked to', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue(mockHits([['agent1']]) as any);

      await collect(esClientMock, ['action1'], { since: '2026-11-07T10:00:00.000Z' });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { terms: { action_id: ['action1'] } },
                { range: { '@timestamp': { gte: '2026-11-07T10:00:00.000Z' } } },
              ],
            },
          },
        })
      );
    });

    it('pages under a point in time rather than truncating at one page', async () => {
      // an action run with a small batchSize writes one document per batch, so it can hold far
      // more than a page; a truncated read would silently action those agents twice
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      const fullPage = Array.from({ length: 1000 }, (_, i) => [`agent${i}`]);
      esClientMock.search
        .mockResolvedValueOnce(mockHits(fullPage) as any)
        .mockResolvedValueOnce({
          pit_id: 'pit2',
          hits: { hits: fullPage.map((agents, i) => ({ _source: { agents }, sort: [i] })) },
        } as any)
        .mockResolvedValueOnce(mockHits([['agent-last']]) as any);
      esClientMock.openPointInTime.mockResolvedValue({ id: 'pit1' } as any);

      const agentIds = await collect(esClientMock, ['action1']);

      expect(agentIds.has('agent-last')).toBe(true);
      expect(agentIds.size).toBe(1001);
      expect(esClientMock.openPointInTime).toHaveBeenCalled();
      // the next page searches the point in time the last one handed back
      expect(esClientMock.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pit: expect.objectContaining({ id: 'pit2' }),
          search_after: [999],
        })
      );
      expect(esClientMock.closePointInTime).toHaveBeenCalledWith({ id: 'pit2' });
    });

    it('stops collecting and stops paging at the limit', async () => {
      // the limit is the caller's memory bound, so it has to stop the read rather than be applied
      // to what it returns: the documents naming a million agents are held to produce that set
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      const fullPage = Array.from({ length: 1000 }, (_, i) => [`agent${i}`]);
      esClientMock.search.mockResolvedValue(mockHits(fullPage) as any);

      const agentIds = await collect(esClientMock, ['action1'], { limit: 10 });

      expect(agentIds.size).toBe(10);
      expect(esClientMock.search).toHaveBeenCalledTimes(1);
      expect(esClientMock.openPointInTime).not.toHaveBeenCalled();
    });

    it('sizes a page to the ids still wanted, not to a document count', async () => {
      // a page of documents says nothing about how big the response is: one document names up to a
      // whole batch of agents, so a thousand of them can carry millions of ids
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue(mockHits([['agent1']]) as any);

      await collect(esClientMock, ['action1'], { limit: 200_000, agentsPerDocument: 10_000 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: 20 }));
    });

    it('reads nothing when the set is already at the limit', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      await collectAgentIdsFromActions(esClientMock, ['action1'], new Set(['agent1']), {
        limit: 1,
      });

      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('closes the point in time when a page fails', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      const fullPage = Array.from({ length: 1000 }, (_, i) => [`agent${i}`]);
      esClientMock.search
        .mockResolvedValueOnce(mockHits(fullPage) as any)
        .mockRejectedValueOnce(new Error('Request timed out'));
      esClientMock.openPointInTime.mockResolvedValue({ id: 'pit1' } as any);

      await expect(collect(esClientMock, ['action1'])).rejects.toThrow('Request timed out');
      expect(esClientMock.closePointInTime).toHaveBeenCalledWith({ id: 'pit1' });
    });
  });

  describe('getAgentsWithoutActionResults', () => {
    it('returns the agents that have no result for the action', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue({
        hits: { hits: [] },
        aggregations: { agent_ids: { buckets: [{ key: 'agent2' }] } },
      } as any);

      await expect(
        getAgentsWithoutActionResults(esClientMock, ['action1'], ['agent1', 'agent2'])
      ).resolves.toEqual(['agent1']);
    });

    it('counts an agent once however many results it has', async () => {
      // result documents carry generated ids, so a retry can write a second one for an agent, and
      // an agent can have one under more than one of the given action ids; a page of hits sized to
      // the number of agents asked about could be filled by those duplicates and hide the rest
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockResolvedValue({
        hits: { hits: [] },
        aggregations: { agent_ids: { buckets: [{ key: 'agent1' }, { key: 'agent2' }] } },
      } as any);

      await expect(
        getAgentsWithoutActionResults(esClientMock, ['action1', 'child1'], ['agent1', 'agent2'])
      ).resolves.toEqual([]);
      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 0,
          aggs: { agent_ids: { terms: { field: 'agent_id', size: 2 } } },
        })
      );
    });

    it('does not search without an agent to look for', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      await expect(getAgentsWithoutActionResults(esClientMock, ['action1'], [])).resolves.toEqual(
        []
      );
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('treats a missing results index as no results at all', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockRejectedValue({ statusCode: 404 });

      await expect(
        getAgentsWithoutActionResults(esClientMock, ['action1'], ['agent1'])
      ).resolves.toEqual(['agent1']);
    });

    it('throws anything else, rather than writing results twice', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();
      esClientMock.search.mockRejectedValue(new Error('Request timed out'));

      await expect(
        getAgentsWithoutActionResults(esClientMock, ['action1'], ['agent1'])
      ).rejects.toThrow('Request timed out');
    });
  });
});
