/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsServiceMock,
  securityServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { isAllowedBuiltinAgent } from '@kbn/agent-builder-server/allow_lists';
import { AgentsService } from './agents_service';
import type { AgentsServiceStart } from './types';
import type { AgentsServiceStartDeps } from './agents_service';
import { createMockedAgent, createToolsServiceStartMock } from '../../test_utils';
import { createClient } from './persisted/client';
import { runToolRefCleanup } from './persisted/tool_reference_cleanup';

jest.mock('@kbn/agent-builder-server/allow_lists');
jest.mock('./persisted/client');
jest.mock('./persisted/tool_reference_cleanup');

const isAllowedBuiltinAgentMock = isAllowedBuiltinAgent as jest.MockedFunction<
  typeof isAllowedBuiltinAgent
>;
const createClientMock = createClient as jest.MockedFunction<typeof createClient>;
const runToolRefCleanupMock = runToolRefCleanup as jest.MockedFunction<typeof runToolRefCleanup>;

const createStartDeps = (): AgentsServiceStartDeps => ({
  getRunner: () => ({ runAgent: jest.fn() } as any),
  security: securityServiceMock.createStart(),
  elasticsearch: elasticsearchServiceMock.createStart(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  savedObjects: savedObjectsServiceMock.createStartContract(),
  spaces: undefined,
  toolsService: createToolsServiceStartMock(),
});

describe('AgentsService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let service: AgentsService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new AgentsService();
  });

  afterEach(() => {
    isAllowedBuiltinAgentMock.mockReset();
    createClientMock.mockReset();
    runToolRefCleanupMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(true);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in agents', () => {
      isAllowedBuiltinAgentMock.mockReturnValue(false);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedAgent())).toThrowErrorMatchingInlineSnapshot(`
        "Built-in agent with id \\"test_agent\\" is not in the list of allowed built-in agents.
                     Please add it to the list of allowed built-in agents in the \\"@kbn/agent-builder-server/allow_lists.ts\\" file."
      `);
    });
  });

  describe('#start', () => {
    let started: AgentsServiceStart;
    let request: KibanaRequest;

    beforeEach(() => {
      isAllowedBuiltinAgentMock.mockReturnValue(true);
      service.setup({ logger });
      createClientMock.mockResolvedValue({
        getAgentsUsingTools: (params: { toolIds: string[] }) =>
          runToolRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            toolIds: params.toolIds,
            logger: undefined,
            checkOnly: true,
          }),
        removeToolRefsFromAgents: (params: { toolIds: string[] }) =>
          runToolRefCleanupMock({
            storage: {} as any,
            spaceId: 'default',
            toolIds: params.toolIds,
            logger: undefined,
          }),
      } as any);
      started = service.start(createStartDeps());
      request = httpServerMock.createKibanaRequest();
    });

    describe('#getAgentsUsingTools', () => {
      it('returns agents that use the given tool IDs', async () => {
        const agents = [
          { id: 'agent-1', name: 'Agent One' },
          { id: 'agent-2', name: 'Agent Two' },
        ];
        runToolRefCleanupMock.mockResolvedValue({ agents });

        const result = await started.getAgentsUsingTools({ request, toolIds: ['tool-1'] });

        expect(result).toEqual({ agents });
        expect(runToolRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1'],
            checkOnly: true,
            spaceId: 'default',
          })
        );
      });

      it('returns empty agents list when runToolRefCleanup returns no agents', async () => {
        runToolRefCleanupMock.mockResolvedValue({ agents: [] });

        const result = await started.getAgentsUsingTools({
          request,
          toolIds: ['tool-1', 'tool-2'],
        });

        expect(result).toEqual({ agents: [] });
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1', 'tool-2'],
            checkOnly: true,
          })
        );
      });

      it('propagates errors from runToolRefCleanup', async () => {
        const error = new Error('Search failed');
        runToolRefCleanupMock.mockRejectedValue(error);

        await expect(started.getAgentsUsingTools({ request, toolIds: ['tool-1'] })).rejects.toThrow(
          'Search failed'
        );
      });
    });

    describe('#removeToolRefsFromAgents', () => {
      it('calls runToolRefCleanup without checkOnly and returns updated agents', async () => {
        const agents = [{ id: 'agent-1', name: 'Agent 1' }];
        runToolRefCleanupMock.mockResolvedValue({ agents });

        await expect(
          started.removeToolRefsFromAgents({ request, toolIds: ['tool-1', 'tool-2'] })
        ).resolves.toEqual({ agents });

        expect(runToolRefCleanupMock).toHaveBeenCalledTimes(1);
        expect(runToolRefCleanupMock).toHaveBeenCalledWith(
          expect.objectContaining({
            toolIds: ['tool-1', 'tool-2'],
            spaceId: 'default',
          })
        );
        expect(runToolRefCleanupMock.mock.calls[0][0]).not.toHaveProperty('checkOnly');
      });

      it('propagates errors from runToolRefCleanup', async () => {
        const error = new Error('Bulk update failed');
        runToolRefCleanupMock.mockRejectedValue(error);

        await expect(
          started.removeToolRefsFromAgents({ request, toolIds: ['tool-1'] })
        ).rejects.toThrow('Bulk update failed');
      });
    });
  });
});
