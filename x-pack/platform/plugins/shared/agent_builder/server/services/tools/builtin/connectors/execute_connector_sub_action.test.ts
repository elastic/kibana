/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { AgentPromptType, AuthorizationStatus } from '@kbn/agent-builder-common/agents';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ErrorResult, OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools/handler';
import {
  getConnectorSpec,
  isToolAction,
  OAUTH_AUTHORIZATION_CODE_AUTH_ID,
  EARS_AUTH_ID,
} from '@kbn/connector-specs';
import {
  createExecuteConnectorSubActionTool,
  executeConnectorSubActionArgsSchema,
} from './execute_connector_sub_action';
import type { ConnectorToolsOptions } from './types';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;
const isToolActionMock = isToolAction as jest.MockedFunction<typeof isToolAction>;

const mockExecute = jest.fn();
const mockGet = jest.fn();
const mockGetActionsClientWithRequest = jest.fn(() =>
  Promise.resolve({ execute: mockExecute, get: mockGet })
);
const getActions: ConnectorToolsOptions['getActions'] = jest.fn(() =>
  Promise.resolve({
    getActionsClientWithRequest: mockGetActionsClientWithRequest,
  })
) as unknown as ConnectorToolsOptions['getActions'];

const mockCheckAuthorizationStatus = jest.fn();
const mockAskForAuthorization = jest.fn();

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {} },
  request: { id: 'test-request' },
  savedObjectsClient: {},
  attachments: {},
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  callContext: {
    toolId: platformCoreTools.executeConnectorSubAction,
    toolCallId: 'call-1',
    callSource: 'agent',
  },
  prompts: {
    checkConfirmationStatus: jest.fn(),
    checkAuthorizationStatus: mockCheckAuthorizationStatus,
    askForConfirmation: jest.fn(),
    askForAuthorization: mockAskForAuthorization,
  },
} as unknown as ToolHandlerContext;

describe('createExecuteConnectorSubActionTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: connector resolves to .slack2, spec found, action is a tool
    mockGet.mockResolvedValue({ id: 'conn-123', actionTypeId: '.slack2' });
    getConnectorSpecMock.mockReturnValue({
      metadata: {
        id: '.slack2',
        displayName: 'Slack',
        description: 'Slack connector',
        minimumLicense: 'enterprise' as const,
        supportedFeatureIds: [],
      },
      actions: {
        searchMessages: { isTool: true, input: {} as any, handler: jest.fn() },
        listChannels: { isTool: true, input: {} as any, handler: jest.fn() },
        sendMessage: { isTool: true, input: {} as any, handler: jest.fn() },
      },
    });
    isToolActionMock.mockReturnValue(true);
    mockCheckAuthorizationStatus.mockReturnValue({ status: AuthorizationStatus.unprompted });
    mockAskForAuthorization.mockImplementation((definition) => ({
      prompt: { type: AgentPromptType.authorization, ...definition },
    }));
  });

  it('has correct id, type, and tags', () => {
    const tool = createExecuteConnectorSubActionTool({ getActions });
    expect(tool.id).toBe(platformCoreTools.executeConnectorSubAction);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['connector', 'sub-action']);
  });

  describe('schema (strict, no structural normalization)', () => {
    it('rejects flattened sub-action fields at the root (unknown keys)', () => {
      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = tool.schema.safeParse({
        connectorId: 'conn-123',
        subAction: 'searchMessages',
        messageId: 'm1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects snake_case aliases (strict canonical keys only)', () => {
      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = tool.schema.safeParse({
        connector_id: 'conn-123',
        sub_action: 'searchMessages',
        params: { query: 'hi' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects payloads missing connectorId and subAction', () => {
      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = tool.schema.safeParse({ messageId: '123' });
      expect(result.success).toBe(false);
    });

    it('includes actionable validation messages for empty connectorId or subAction', () => {
      const emptyConnectorId = executeConnectorSubActionArgsSchema.safeParse({
        connectorId: '',
        subAction: 'searchMessages',
        params: {},
      });
      expect(emptyConnectorId.success).toBe(false);
      if (!emptyConnectorId.success) {
        expect(
          emptyConnectorId.error.issues.some((i) => i.message.includes('connector attachment'))
        ).toBe(true);
      }

      const emptySubAction = executeConnectorSubActionArgsSchema.safeParse({
        connectorId: 'conn-123',
        subAction: '',
        params: {},
      });
      expect(emptySubAction.success).toBe(false);
      if (!emptySubAction.success) {
        expect(emptySubAction.error.issues.some((i) => i.message.includes('infer'))).toBe(true);
      }
    });
  });

  it('executes a sub-action successfully', async () => {
    mockExecute.mockResolvedValue({
      status: 'ok',
      data: { messages: [{ text: 'hello' }] },
    });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'searchMessages',
        params: { query: 'hello' },
      },
      mockContext
    );

    expect(getActions).toHaveBeenCalled();
    expect(mockGetActionsClientWithRequest).toHaveBeenCalledWith(mockContext.request);
    expect(mockGet).toHaveBeenCalledWith({ id: 'conn-123' });
    expect(mockExecute).toHaveBeenCalledWith({
      actionId: 'conn-123',
      params: {
        subAction: 'searchMessages',
        subActionParams: { query: 'hello' },
      },
    });
    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.other);
    expect(((result as ToolHandlerStandardReturn).results[0] as OtherResult).data).toEqual({
      messages: [{ text: 'hello' }],
    });
  });

  it('defaults params to empty object', async () => {
    mockExecute.mockResolvedValue({ status: 'ok', data: { ok: true } });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'listChannels',
        params: {},
      },
      mockContext
    );

    expect(mockExecute).toHaveBeenCalledWith({
      actionId: 'conn-123',
      params: {
        subAction: 'listChannels',
        subActionParams: {},
      },
    });
  });

  it('rejects sub-actions not marked as isTool', async () => {
    getConnectorSpecMock.mockReturnValue({
      metadata: {
        id: '.slack2',
        displayName: 'Slack',
        description: 'Slack connector',
        minimumLicense: 'enterprise' as const,
        supportedFeatureIds: [],
      },
      actions: { internalAction: { isTool: false, input: {} as any, handler: jest.fn() } },
    });
    isToolActionMock.mockReturnValue(false);

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'internalAction',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("Sub-action 'internalAction' is not available as a tool");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when no connector spec is found for the type', async () => {
    mockGet.mockResolvedValue({ id: 'conn-123', actionTypeId: '.unknown' });
    getConnectorSpecMock.mockReturnValue(undefined);

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'doSomething',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("No connector spec found for type '.unknown'");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when connector resolution fails', async () => {
    mockGet.mockRejectedValue(new Error('Saved object not found'));

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'bad-id',
        subAction: 'search',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("Failed to resolve connector 'bad-id'");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error result when execute throws', async () => {
    mockExecute.mockRejectedValue(new Error('Connector execution failed'));

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'search',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain('Connector execution failed');
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("sub-action 'search'");
  });

  it('returns error result when connector returns error status', async () => {
    mockExecute.mockResolvedValue({
      status: 'error',
      message: 'Rate limited',
      serviceMessage: 'Too many requests',
    });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'sendMessage',
        params: { text: 'hi' },
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain('Rate limited');
  });

  it('returns success message when data is null', async () => {
    mockExecute.mockResolvedValue({ status: 'ok', data: null });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'sendMessage',
        params: { text: 'hi' },
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(((result as ToolHandlerStandardReturn).results[0] as OtherResult).data).toEqual({
      message: 'Sub-action executed successfully',
    });
  });

  describe('connector authorization (HITL prompt)', () => {
    const expectedPromptId = `tools.${platformCoreTools.executeConnectorSubAction}.authorization.conn-123`;

    const authErrorResult = (overrides: Record<string, unknown> = {}) => ({
      status: 'error' as const,
      message: 'an error occurred while running the action',
      serviceMessage: 'No access token found. User must complete OAuth authorization flow.',
      errorName: 'ConnectorAuthorizationError',
      errorMeta: {
        connectorName: 'My Slack',
        authMethod: OAUTH_AUTHORIZATION_CODE_AUTH_ID,
        reason: 'no_token',
      },
      ...overrides,
    });

    it('raises an authorization prompt for an oauth_authorization_code connector', async () => {
      mockExecute.mockResolvedValue(authErrorResult());

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect(mockCheckAuthorizationStatus).toHaveBeenCalledWith(expectedPromptId);
      expect(mockAskForAuthorization).toHaveBeenCalledTimes(1);
      expect((result as ToolHandlerPromptReturn).prompt).toEqual({
        type: AgentPromptType.authorization,
        id: expectedPromptId,
        connector_id: 'conn-123',
        connector_name: 'My Slack',
        connector_type: '.slack2',
        auth_method: OAUTH_AUTHORIZATION_CODE_AUTH_ID,
      });
    });

    it('raises an authorization prompt for an EARS connector', async () => {
      mockExecute.mockResolvedValue(
        authErrorResult({
          errorMeta: {
            connectorName: 'My Google',
            authMethod: EARS_AUTH_ID,
            reason: 'token_expired',
          },
        })
      );

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect((result as ToolHandlerPromptReturn).prompt).toEqual({
        type: AgentPromptType.authorization,
        id: expectedPromptId,
        connector_id: 'conn-123',
        connector_name: 'My Google',
        connector_type: '.slack2',
        auth_method: EARS_AUTH_ID,
      });
    });

    it('falls back to connectorId when the connector name is missing from the metadata', async () => {
      mockExecute.mockResolvedValue(
        authErrorResult({
          errorMeta: { authMethod: OAUTH_AUTHORIZATION_CODE_AUTH_ID, reason: 'no_token' },
        })
      );

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect((result as ToolHandlerPromptReturn).prompt).toMatchObject({
        connector_name: 'conn-123',
      });
    });

    it('does not raise a prompt for an unsupported auth method', async () => {
      mockExecute.mockResolvedValue(
        authErrorResult({
          errorMeta: { connectorName: 'My Connector', authMethod: 'basic', reason: 'no_token' },
        })
      );

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect(mockAskForAuthorization).not.toHaveBeenCalled();
      expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    });

    it('does not re-raise the prompt when authorization was declined', async () => {
      mockCheckAuthorizationStatus.mockReturnValue({ status: AuthorizationStatus.declined });
      mockExecute.mockResolvedValue(authErrorResult());

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect(mockAskForAuthorization).not.toHaveBeenCalled();
      expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    });

    it('does not re-raise the prompt when already authorized but execution still fails', async () => {
      mockCheckAuthorizationStatus.mockReturnValue({ status: AuthorizationStatus.authorized });
      mockExecute.mockResolvedValue(authErrorResult());

      const tool = createExecuteConnectorSubActionTool({ getActions });
      const result = await tool.handler(
        { connectorId: 'conn-123', subAction: 'searchMessages', params: {} },
        mockContext
      );

      expect(mockAskForAuthorization).not.toHaveBeenCalled();
      expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    });
  });
});
