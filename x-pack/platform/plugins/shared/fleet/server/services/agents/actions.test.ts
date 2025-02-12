/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { NewAgentAction, AgentActionType } from '../../../common/types';

import { createAppContextStartContractMock, type MockedFleetAppContext } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';

import {
  bulkCreateAgentActionResults,
  bulkCreateAgentActions,
  cancelAgentAction,
  createAgentAction,
  getAgentsByActionsIds,
} from './actions';
import { bulkUpdateAgents } from './crud';

jest.mock('./crud');
jest.mock('../audit_logging');

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

      await createAgentAction(esClient, {
        id: 'action1',
        type: 'UPGRADE',
        agents: ['agent1'],
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: expect.stringMatching(/User created Fleet action/),
      });
    });

    it.each(['UNENROLL', 'UPGRADE'] as AgentActionType[])(
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

        await createAgentAction(esClient, {
          id: 'action1',
          type: actionType,
          agents: ['agent1'],
        });

        expect(esClient.create).toBeCalledWith(
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

      await createAgentAction(esClient, {
        id: 'action1',
        type: actionType,
        agents: ['agent1'],
      });

      expect(esClient.create).toBeCalledWith(
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

    it('should sign UNENROLL and UPGRADE actions', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      const newActions: NewAgentAction[] = (['UNENROLL', 'UPGRADE'] as AgentActionType[]).map(
        (actionType, i) => {
          const actionId = `action${i + 1}`;
          return {
            id: actionId,
            type: actionType,
            agents: [actionId],
          };
        }
      );

      await bulkCreateAgentActions(esClient, newActions);
      expect(esClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
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

    it('should not sign actions other than UNENROLL and UPGRADE', async () => {
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
    it('should throw if the target action is not found', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);
      const soClient = savedObjectsClientMock.create();
      await expect(() =>
        cancelAgentAction(esClient, soClient, 'i-do-not-exists')
      ).rejects.toThrowError(/Action not found/);
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

      expect(esClient.create).toBeCalledTimes(2);
      expect(esClient.create).toBeCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'action1' },
            agents: ['agent1', 'agent2'],
          }),
        })
      );
      expect(esClient.create).toBeCalledWith(
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

      expect(mockedBulkUpdateAgents).toBeCalled();
      expect(mockedBulkUpdateAgents).toBeCalledWith(
        expect.anything(),
        [
          expect.objectContaining({ agentId: 'agent1' }),
          expect.objectContaining({ agentId: 'agent2' }),
        ],
        {}
      );
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
});
