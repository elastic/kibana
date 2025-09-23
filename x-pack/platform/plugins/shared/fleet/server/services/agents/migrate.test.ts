/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { AgentPolicy, Agent } from '../../types';

import { FleetError } from '../../errors';

import { bulkMigrateAgents, migrateSingleAgent } from './migrate';
import { createAgentAction, createErrorActionResults } from './actions';
import { getAgentPolicyForAgents, getAgents } from './crud';

// Mock the imported functions
jest.mock('./actions');

jest.mock('./crud', () => {
  return {
    getAgentPolicyForAgents: jest.fn(),
    getAgents: jest.fn(),
    getAgentsByKuery: jest.fn(),
    openPointInTime: jest.fn(),
  };
});

const mockedCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockedCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;

const mockedAgent: Agent = {
  id: 'agent-123',
  policy_id: 'policy-456',
  last_checkin: new Date().toISOString(),
  components: [],
  local_metadata: {
    elastic: {
      agent: {
        version: '1.0.0',
      },
    },
  },
  enrolled_at: new Date().toISOString(),
  active: true,
  packages: [],
  type: 'PERMANENT',
};
const mockedPolicy: AgentPolicy = {
  id: 'policy-456',
  is_protected: false,
  status: 'active',
  is_managed: false,
  updated_at: new Date().toISOString(),
  updated_by: 'kibana',
  revision: 1,
  name: 'Test Policy',
  namespace: 'default',
};

describe('Agent migration', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;
  const soClientMock = {
    getCurrentNamespace: jest.fn(),
  } as any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    esClientMock = elasticsearchServiceMock.createInternalClient();

    (getAgentPolicyForAgents as jest.Mock).mockResolvedValue([mockedPolicy]);

    // Mock the createAgentAction response
    mockedCreateAgentAction.mockResolvedValue({
      id: 'test-action-id',
      type: 'MIGRATE',
      agents: ['agent-123'],
      created_at: new Date().toISOString(),
    });
    mockedPolicy.is_protected = false;
  });

  describe('migrateSingleAgent', () => {
    it('should create a MIGRATE action for the specified agent', async () => {
      const agentId = 'agent-123';
      const options = {
        policyId: 'policy-456',
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
        settings: { timeout: 300 },
      };

      const result = await migrateSingleAgent(
        esClientMock,
        soClientMock,
        agentId,
        mockedPolicy,
        mockedAgent,
        options
      );

      // Verify createAgentAction was called with correct params
      expect(mockedCreateAgentAction).toHaveBeenCalledTimes(1);
      expect(mockedCreateAgentAction).toHaveBeenCalledWith(esClientMock, soClientMock, {
        agents: [agentId],
        created_at: expect.any(String),
        type: 'MIGRATE',
        policyId: options.policyId,
        data: {
          enrollment_token: options.enrollment_token,
          target_uri: options.uri,
          settings: options.settings,
        },
      });

      // Verify result contains the action ID from createAgentAction
      expect(result).toEqual({ actionId: 'test-action-id' });
    });

    it('should handle empty additional settings', async () => {
      const agentId = 'agent-123';
      const options = {
        policyId: 'policy-456',
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
      };

      await migrateSingleAgent(
        esClientMock,
        soClientMock,
        agentId,
        mockedPolicy,
        mockedAgent,
        options
      );

      // Verify createAgentAction was called with correct params and undefined additionalSettings
      expect(mockedCreateAgentAction).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        expect.objectContaining({
          data: {
            enrollment_token: options.enrollment_token,
            target_uri: options.uri,
            settings: undefined,
          },
        })
      );
    });

    it('should throw an error if the agent is protected', async () => {
      const agentId = 'agent-123';
      const options = {
        policyId: 'policy-456',
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
      };
      mockedPolicy.is_protected = true;
      await expect(
        migrateSingleAgent(esClientMock, soClientMock, agentId, mockedPolicy, mockedAgent, options)
      ).rejects.toThrowError('Agent is protected and cannot be migrated');
    });
  });

  // Bulk migrate

  describe('migrateBulkAgents', () => {
    it('should create a MIGRATE action for the specified agents', async () => {
      (getAgents as jest.Mock).mockResolvedValue([mockedAgent, mockedAgent]);
      const options = {
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
        settings: { timeout: 300 },
      };

      await bulkMigrateAgents(esClientMock, soClientMock, {
        ...options,
        agentIds: [mockedAgent.id, mockedAgent.id],
      });

      // Verify createAgentAction was called with correct params
      expect(mockedCreateAgentAction).toHaveBeenCalledTimes(1);
      expect(mockedCreateAgentAction).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        expect.objectContaining({
          agents: [mockedAgent.id, mockedAgent.id],
          type: 'MIGRATE',
          data: {
            enrollment_token: options.enrollment_token,
            target_uri: options.uri,
            settings: options.settings,
          },
          total: 2,
          namespaces: ['default'],
        })
      );
    });

    it('should handle empty additional settings', async () => {
      (getAgents as jest.Mock).mockResolvedValue([mockedAgent, mockedAgent]);
      const options = {
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
      };

      await bulkMigrateAgents(esClientMock, soClientMock, {
        ...options,
        agentIds: [mockedAgent.id, mockedAgent.id],
      });

      // Verify createAgentAction was called with correct params and undefined additionalSettings
      expect(mockedCreateAgentAction).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        expect.objectContaining({
          data: {
            enrollment_token: options.enrollment_token,
            target_uri: options.uri,
            settings: undefined,
          },
        })
      );
    });

    it('should record error result if the agent is protected', async () => {
      (getAgents as jest.Mock).mockResolvedValue([mockedAgent, mockedAgent]);
      const options = {
        enrollment_token: 'test-enrollment-token',
        uri: 'https://test-fleet-server.example.com',
      };
      mockedPolicy.is_protected = true;
      await bulkMigrateAgents(esClientMock, soClientMock, {
        ...options,
        agentIds: [mockedAgent.id, mockedAgent.id],
      });
      expect(mockedCreateErrorActionResults).toHaveBeenCalledWith(
        esClientMock,
        expect.any(String),
        {
          'agent-123': new FleetError(
            'Agent agent-123 cannot be migrated because it is protected.'
          ),
        },
        'agent does not support migration action'
      );
    });
  });
});
