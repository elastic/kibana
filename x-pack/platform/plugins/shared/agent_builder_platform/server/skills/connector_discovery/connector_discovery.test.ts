/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createListConnectorsTool } from './list_connectors_tool';
import { createGetConnectorSubActionsTool } from './get_connector_sub_actions_tool';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(),
}));

jest.mock('@kbn/agent-builder-server', () => ({
  getToolResultId: jest.fn().mockReturnValue('test-id'),
  createErrorResult: jest.fn((opts: { message: string }) => ({
    tool_result_id: 'err-id',
    type: 'error',
    data: { message: opts.message },
  })),
  formatSchemaForLlm: jest.fn(() => '{ title: string }'),
}));

const mockGetConnectorSpec = getConnectorSpec as jest.Mock;
const mockIsToolAction = isToolAction as jest.Mock;

const makeConnector = (overrides: Partial<{ id: string; name: string; actionTypeId: string }>) => ({
  id: 'conn-1',
  name: 'My GitHub',
  actionTypeId: '.github',
  ...overrides,
});

const makeSpec = (description = 'GitHub connector', actions: Record<string, unknown> = {}) => ({
  metadata: { id: '.github', description },
  actions,
});

const makeActionsStart = (connectors: ReturnType<typeof makeConnector>[] = []) => {
  const mockGetAll = jest.fn().mockResolvedValue(connectors);
  const mockGet = jest.fn().mockImplementation(({ id }: { id: string }) => {
    const c = connectors.find((x) => x.id === id);
    if (!c) throw new Error(`Connector '${id}' not found`);
    return Promise.resolve(c);
  });
  const actionsClient = { getAll: mockGetAll, get: mockGet };
  const getActionsClientWithRequest = jest.fn().mockResolvedValue(actionsClient);
  return {
    actionsStart: { getActionsClientWithRequest } as unknown as ActionsPluginStart,
    mockGetAll,
    mockGet,
    getActionsClientWithRequest,
  };
};

const makeContext = () => ({ request: {} } as unknown as ToolHandlerContext);

describe('connector-discovery inline tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnectorSpec.mockReturnValue(undefined);
    mockIsToolAction.mockReturnValue(false);
  });

  describe('list_connectors', () => {
    it('returns an empty list when there are no callable connectors', async () => {
      const { actionsStart } = makeActionsStart([]);
      const tool = createListConnectorsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler({}, makeContext())) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as { connectors: unknown[]; total: number };
      expect(data.connectors).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('filters out connectors that have no spec and are not MCP', async () => {
      const { actionsStart } = makeActionsStart([
        makeConnector({ id: 'c1', actionTypeId: '.email' }),
        makeConnector({ id: 'c2', actionTypeId: '.github' }),
      ]);
      mockGetConnectorSpec.mockImplementation((id: string) =>
        id === '.github' ? makeSpec() : undefined
      );
      const tool = createListConnectorsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler({}, makeContext())) as ToolHandlerStandardReturn;

      const data = result.results[0].data as { connectors: Array<{ id: string }> };
      expect(data.connectors).toHaveLength(1);
      expect(data.connectors[0].id).toBe('c2');
    });

    it('includes MCP connectors even without a spec', async () => {
      const { actionsStart } = makeActionsStart([makeConnector({ actionTypeId: '.mcp' })]);
      mockGetConnectorSpec.mockReturnValue(undefined);
      const tool = createListConnectorsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler({}, makeContext())) as ToolHandlerStandardReturn;

      const data = result.results[0].data as { connectors: Array<{ type: string }> };
      expect(data.connectors).toHaveLength(1);
      expect(data.connectors[0].type).toBe('.mcp');
    });

    it('uses spec description when available, falls back to connector name', async () => {
      const { actionsStart } = makeActionsStart([
        makeConnector({ id: 'c1', name: 'My GitHub', actionTypeId: '.github' }),
        makeConnector({ id: 'c2', name: 'My MCP', actionTypeId: '.mcp' }),
      ]);
      mockGetConnectorSpec.mockImplementation((id: string) =>
        id === '.github' ? makeSpec('Manage GitHub issues') : undefined
      );
      const tool = createListConnectorsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler({}, makeContext())) as ToolHandlerStandardReturn;

      const data = result.results[0].data as {
        connectors: Array<{ id: string; description: string }>;
      };
      expect(data.connectors.find((c) => c.id === 'c1')?.description).toBe('Manage GitHub issues');
      expect(data.connectors.find((c) => c.id === 'c2')?.description).toBe('My MCP');
    });

    it('returns an error result when getAll throws', async () => {
      const getActionsClientWithRequest = jest.fn().mockResolvedValue({
        getAll: jest.fn().mockRejectedValue(new Error('network error')),
      });
      const actionsStart = { getActionsClientWithRequest } as unknown as ActionsPluginStart;
      const tool = createListConnectorsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler({}, makeContext())) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('get_connector_sub_actions', () => {
    it('returns an error when the connector type has no spec', async () => {
      const { actionsStart } = makeActionsStart([makeConnector({ actionTypeId: '.email' })]);
      mockGetConnectorSpec.mockReturnValue(undefined);
      const tool = createGetConnectorSubActionsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        { connector_id: 'conn-1' },
        makeContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('returns only isTool:true sub-actions', async () => {
      const { actionsStart } = makeActionsStart([makeConnector()]);
      const spec = makeSpec('GitHub connector', {
        createIssue: { isTool: true, description: 'Create an issue', input: {} },
        internalOp: { isTool: false, description: 'Internal', input: {} },
      });
      mockGetConnectorSpec.mockReturnValue(spec);
      mockIsToolAction.mockImplementation((_: unknown, name: string) => name === 'createIssue');
      const tool = createGetConnectorSubActionsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        { connector_id: 'conn-1' },
        makeContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as {
        subActions: Array<{ name: string; description: string }>;
      };
      expect(data.subActions).toHaveLength(1);
      expect(data.subActions[0].name).toBe('createIssue');
      expect(data.subActions[0].description).toBe('Create an issue');
    });

    it('returns the full connector detail shape', async () => {
      const { actionsStart } = makeActionsStart([
        makeConnector({ id: 'abc', name: 'My GitHub', actionTypeId: '.github' }),
      ]);
      const spec = makeSpec('Manage GitHub issues', {
        createIssue: { isTool: true, description: 'Create an issue', input: {} },
      });
      mockGetConnectorSpec.mockReturnValue(spec);
      mockIsToolAction.mockReturnValue(true);
      const tool = createGetConnectorSubActionsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        { connector_id: 'abc' },
        makeContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      const data = result.results[0].data as {
        id: string;
        name: string;
        type: string;
        description: string;
        subActions: unknown[];
      };
      expect(data.id).toBe('abc');
      expect(data.name).toBe('My GitHub');
      expect(data.type).toBe('.github');
      expect(data.description).toBe('Manage GitHub issues');
      expect(data.subActions).toHaveLength(1);
    });

    it('falls back to connector name when spec has no description', async () => {
      const { actionsStart } = makeActionsStart([makeConnector({ name: 'My Connector' })]);
      mockGetConnectorSpec.mockReturnValue({ metadata: { id: '.github' }, actions: {} });
      const tool = createGetConnectorSubActionsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        { connector_id: 'conn-1' },
        makeContext()
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as { description: string };
      expect(data.description).toBe('My Connector');
    });

    it('returns an error result when actionsClient.get throws', async () => {
      const getActionsClientWithRequest = jest.fn().mockResolvedValue({
        get: jest.fn().mockRejectedValue(new Error('not found')),
      });
      const actionsStart = { getActionsClientWithRequest } as unknown as ActionsPluginStart;
      const tool = createGetConnectorSubActionsTool({ getActionsStart: async () => actionsStart });

      const result = (await tool.handler(
        { connector_id: 'missing' },
        makeContext()
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });
});
