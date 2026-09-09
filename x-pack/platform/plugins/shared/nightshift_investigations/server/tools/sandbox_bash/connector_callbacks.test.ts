/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, IScopedClusterClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import { handleElasticsearchCallback } from './elasticsearch_connector';
import type { ConnectorCallbackRequest } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';
import { createConnectorCallbackHandler } from './connector_callbacks';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(),
}));

jest.mock('./elasticsearch_connector', () => ({
  handleElasticsearchCallback: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;
const isToolActionMock = isToolAction as jest.MockedFunction<typeof isToolAction>;
const handleElasticsearchCallbackMock = handleElasticsearchCallback as jest.MockedFunction<
  typeof handleElasticsearchCallback
>;

// The spec object is opaque to the handler: it only forwards it to isToolAction, which is mocked.
const someConnectorSpec = { metadata: { id: '.slack' } } as unknown as ConnectorSpec;

const esClient = {} as IScopedClusterClient;

const createCallContext = (allowedConnectorIds: readonly string[]): SandboxCallContext => ({
  request: {} as KibanaRequest,
  allowedConnectorIds,
  esClient,
});

const createCallbackRequest = (
  overrides: Partial<ConnectorCallbackRequest> = {}
): ConnectorCallbackRequest => ({
  request_id: 'req-1',
  connector_id: 'slack-1',
  sub_action: 'postMessage',
  sub_action_params: Buffer.from(JSON.stringify({ text: 'hello' })),
  ...overrides,
});

const createConnectorResult = (actionTypeId: string) => ({
  id: 'slack-1',
  actionTypeId,
  name: 'My Slack',
  config: { webhookUrl: 'https://hooks.slack.example/secret' },
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

describe('createConnectorCallbackHandler', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let getActionsClient: jest.Mock;
  let logger: ReturnType<typeof loggerMock.create>;

  const createHandler = ({ withActionsClient = true }: { withActionsClient?: boolean } = {}) =>
    createConnectorCallbackHandler({
      getActionsClient: withActionsClient ? getActionsClient : undefined,
      logger,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    actionsClient = actionsClientMock.create();
    getActionsClient = jest.fn().mockResolvedValue(actionsClient);
    actionsClient.get.mockResolvedValue(createConnectorResult('.slack'));
    actionsClient.execute.mockResolvedValue({ actionId: 'slack-1', status: 'ok', data: { ok: 1 } });
    getConnectorSpecMock.mockReturnValue(someConnectorSpec);
    isToolActionMock.mockReturnValue(true);
  });

  describe('successful execution', () => {
    it('executes the sub-action and returns the serialized data', async () => {
      const data = { messages: [{ id: 'm1', text: 'hi' }], nested: { count: 2 } };
      actionsClient.execute.mockResolvedValue({ actionId: 'slack-1', status: 'ok', data });

      const result = await createHandler()(
        createCallContext(['slack-1']),
        createCallbackRequest({ sub_action_params: Buffer.from(JSON.stringify({ text: 'hi' })) })
      );

      expect(result.status).toBe('ok');
      expect(result.error_message).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(JSON.parse(String(result.data))).toEqual(data);
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'slack-1',
        params: { subAction: 'postMessage', subActionParams: { text: 'hi' } },
      });
    });

    it('passes empty sub-action params when the payload is empty', async () => {
      const result = await createHandler()(
        createCallContext(['slack-1']),
        createCallbackRequest({ sub_action_params: Buffer.alloc(0) })
      );

      expect(result.status).toBe('ok');
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'slack-1',
        params: { subAction: 'postMessage', subActionParams: {} },
      });
    });

    it('serializes null when the connector returns no data', async () => {
      actionsClient.execute.mockResolvedValue({ actionId: 'slack-1', status: 'ok' });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('ok');
      expect(String(result.data)).toBe('null');
    });
  });

  describe('allow-list enforcement', () => {
    it('rejects a connector that is not assigned to the agent', async () => {
      const result = await createHandler()(
        createCallContext(['github-1', 'pagerduty-1']),
        createCallbackRequest({ connector_id: 'slack-1' })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain("Connector 'slack-1' is not assigned to this agent");
      expect(result.error_message).toContain('Assigned connectors: github-1, pagerduty-1');
      expect(result.error_message).toContain('/workspace/connectors.md');
      expect(result.data).toBeUndefined();
      expect(actionsClient.get).not.toHaveBeenCalled();
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('denies by default when the allow-list is empty', async () => {
      const result = await createHandler()(
        createCallContext([]),
        createCallbackRequest({ connector_id: 'slack-1' })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Assigned connectors: none');
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('does not allow a connector id that is only a prefix/substring of an allowed one', async () => {
      const results = await Promise.all(
        ['slack', 'slack-11', 'SLACK-1', 'slack-1 '].map((connectorId) =>
          createHandler()(
            createCallContext(['slack-1']),
            createCallbackRequest({ connector_id: connectorId })
          )
        )
      );

      for (const result of results) {
        expect(result.status).toBe('error');
        expect(result.error_message).toContain('is not assigned to this agent');
      }
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('reaches the synthetic elasticsearch handler even with an empty allow-list', async () => {
      handleElasticsearchCallbackMock.mockResolvedValue({
        status: 'ok',
        data: Buffer.from('[]'),
      });
      const callContext = createCallContext([]);
      const cb = createCallbackRequest({ connector_id: 'elasticsearch', sub_action: 'esql' });

      const result = await createHandler()(callContext, cb);

      expect(handleElasticsearchCallbackMock).toHaveBeenCalledWith(cb, esClient);
      expect(result).toEqual({ status: 'ok', data: Buffer.from('[]') });
      expect(getActionsClient).not.toHaveBeenCalled();
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });
  });

  describe('sub-action gating', () => {
    it('rejects a sub-action that is not a tool action of the connector spec', async () => {
      isToolActionMock.mockReturnValue(false);

      const result = await createHandler()(
        createCallContext(['slack-1']),
        createCallbackRequest({ sub_action: 'deleteEverything' })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain(
        "Sub-action 'deleteEverything' is not available on connector type '.slack'"
      );
      expect(result.error_message).toContain('/workspace/connectors.md');
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('skips the gate for legacy connectors without a spec', async () => {
      getConnectorSpecMock.mockReturnValue(undefined);
      actionsClient.get.mockResolvedValue(createConnectorResult('.legacy-webhook'));

      const result = await createHandler()(
        createCallContext(['slack-1']),
        createCallbackRequest({ sub_action: 'anything' })
      );

      expect(result.status).toBe('ok');
      expect(isToolActionMock).not.toHaveBeenCalled();
      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'slack-1',
        params: { subAction: 'anything', subActionParams: { text: 'hello' } },
      });
    });
  });

  describe('error results', () => {
    it('returns an error when the actions client is not available', async () => {
      const result = await createHandler({ withActionsClient: false })(
        createCallContext(['slack-1']),
        createCallbackRequest()
      );

      expect(result).toEqual({
        status: 'error',
        error_message: 'Connectors are not available in this deployment',
      });
    });

    it('returns an error when the actions client cannot be obtained', async () => {
      getActionsClient.mockRejectedValue(new Error('no client for you'));

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Failed to get actions client');
      expect(result.error_message).toContain('no client for you');
    });

    it('returns an error for malformed sub_action_params JSON', async () => {
      const result = await createHandler()(
        createCallContext(['slack-1']),
        createCallbackRequest({ sub_action_params: Buffer.from('{ not json') })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Invalid sub_action_params JSON');
      expect(actionsClient.get).not.toHaveBeenCalled();
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('returns an error when the connector cannot be resolved', async () => {
      actionsClient.get.mockRejectedValue(new Error('not found'));

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('error');
      expect(result.error_message).toContain("Failed to resolve connector 'slack-1'");
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('returns an error when execute throws instead of propagating it', async () => {
      actionsClient.execute.mockRejectedValue(new Error('boom'));

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('error');
      expect(result.error_message).toContain(
        "Failed to execute sub-action 'postMessage' on connector 'slack-1'"
      );
      expect(result.error_message).toContain('boom');
    });

    it('maps a connector error result to message and serviceMessage', async () => {
      actionsClient.execute.mockResolvedValue({
        actionId: 'slack-1',
        status: 'error',
        message: 'an error occurred while running the action',
        serviceMessage: 'channel_not_found',
      });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result).toEqual({
        status: 'error',
        error_message: 'an error occurred while running the action: channel_not_found',
      });
    });

    it('falls back to a generic message when the connector error has no details', async () => {
      actionsClient.execute.mockResolvedValue({ actionId: 'slack-1', status: 'error' });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result).toEqual({ status: 'error', error_message: 'Connector returned an error' });
    });

    it('maps ConnectorAuthorizationError to an authorization hint', async () => {
      actionsClient.execute.mockResolvedValue({
        actionId: 'slack-1',
        status: 'error',
        message: 'Unauthorized',
        serviceMessage: 'token expired',
        errorName: 'ConnectorAuthorizationError',
      });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result).toEqual({
        status: 'error',
        error_message:
          'Connector requires authorization in Kibana first. Contact your administrator.',
      });
    });

    it('rejects responses larger than 1 MiB', async () => {
      actionsClient.execute.mockResolvedValue({
        actionId: 'slack-1',
        status: 'ok',
        data: { blob: 'x'.repeat(1_048_576) },
      });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result).toEqual({
        status: 'error',
        error_message: 'Response too large (limit 1 MiB). Request fewer fields or smaller page.',
      });
    });

    it('accepts responses at the 1 MiB boundary', async () => {
      // {"blob":"..."} adds 11 bytes of JSON overhead.
      actionsClient.execute.mockResolvedValue({
        actionId: 'slack-1',
        status: 'ok',
        data: { blob: 'x'.repeat(1_048_576 - 11) },
      });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('ok');
      expect(result.data?.length).toBe(1_048_576);
    });
  });

  describe('never throws', () => {
    it('returns an error result for every failing actions client method', async () => {
      const failure = new Error('client exploded');
      const scenarios = [
        () => getActionsClient.mockRejectedValue(failure),
        () => actionsClient.get.mockRejectedValue(failure),
        () => actionsClient.execute.mockRejectedValue(failure),
      ];

      for (const applyFailure of scenarios) {
        jest.clearAllMocks();
        getActionsClient.mockResolvedValue(actionsClient);
        actionsClient.get.mockResolvedValue(createConnectorResult('.slack'));
        actionsClient.execute.mockResolvedValue({ actionId: 'slack-1', status: 'ok' });
        getConnectorSpecMock.mockReturnValue(someConnectorSpec);
        isToolActionMock.mockReturnValue(true);
        applyFailure();

        const result = await createHandler()(
          createCallContext(['slack-1']),
          createCallbackRequest()
        );

        expect(result.status).toBe('error');
        expect(result.error_message).toContain('client exploded');
      }
    });

    it('returns an error result when the actions client throws synchronously', async () => {
      getActionsClient.mockImplementation(() => {
        throw new Error('sync explosion');
      });

      const result = await createHandler()(createCallContext(['slack-1']), createCallbackRequest());

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('sync explosion');
    });
  });

  describe('the HTTP connector, which is not sub-action based', () => {
    const httpRequest = (subAction: string, params: Record<string, unknown>) =>
      createCallbackRequest({
        sub_action: subAction,
        sub_action_params: Buffer.from(JSON.stringify(params)),
      });

    beforeEach(() => {
      actionsClient.get.mockResolvedValue(createConnectorResult('.http'));
      actionsClient.execute.mockResolvedValue({
        actionId: 'slack-1',
        status: 'ok',
        data: { status: 200 },
      });
    });

    it('sends flat params instead of the subAction wrapper', async () => {
      await createHandler()(createCallContext(['slack-1']), httpRequest('GET', { path: '/json' }));

      expect(actionsClient.execute).toHaveBeenCalledWith({
        actionId: 'slack-1',
        params: { method: 'GET', path: '/json' },
      });
    });

    it('refuses to let the sandbox redirect the connector at another host', async () => {
      const result = await createHandler()(
        createCallContext(['slack-1']),
        httpRequest('GET', { url: 'https://attacker.example', path: '/x' })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain("'url' cannot be set from the sandbox");
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('rejects an invalid verb without calling the connector', async () => {
      const result = await createHandler()(
        createCallContext(['slack-1']),
        httpRequest('FETCH', { path: '/json' })
      );

      expect(result.status).toBe('error');
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('still enforces the allow-list', async () => {
      const result = await createHandler()(
        createCallContext([]),
        httpRequest('GET', { path: '/json' })
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('is not assigned to this agent');
      expect(actionsClient.execute).not.toHaveBeenCalled();
    });

    it('does not consult the sub-action spec gate', async () => {
      isToolActionMock.mockReturnValue(false);
      getConnectorSpecMock.mockReturnValue(someConnectorSpec);

      const result = await createHandler()(
        createCallContext(['slack-1']),
        httpRequest('GET', { path: '/json' })
      );

      expect(result.status).toBe('ok');
    });
  });
});
