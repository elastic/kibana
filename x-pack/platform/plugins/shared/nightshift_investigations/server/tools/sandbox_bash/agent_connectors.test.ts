/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { SandboxCallContext } from './tool_utils';
import { listAgentConnectors } from './agent_connectors';

const SECRET_WEBHOOK_URL = 'https://hooks.slack.example/T000/B000/super-secret-token';

const createCallContext = (allowedConnectorIds: readonly string[]): SandboxCallContext => ({
  request: {} as KibanaRequest,
  allowedConnectorIds,
});

const createConnector = ({
  id,
  name,
  actionTypeId,
  config = {},
}: {
  id: string;
  name: string;
  actionTypeId: string;
  config?: Record<string, unknown>;
}) => ({
  id,
  name,
  actionTypeId,
  config,
  isMissingSecrets: false,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  referencedByCount: 0,
});

describe('listAgentConnectors', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let getActionsClient: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient = actionsClientMock.create();
    getActionsClient = jest.fn().mockResolvedValue(actionsClient);
    actionsClient.getAll.mockResolvedValue([
      createConnector({
        id: 'slack-1',
        name: 'My Slack',
        actionTypeId: '.slack',
        config: { webhookUrl: SECRET_WEBHOOK_URL },
      }),
      createConnector({ id: 'github-1', name: 'My GitHub', actionTypeId: '.github' }),
      createConnector({ id: 'email-1', name: 'Ops email', actionTypeId: '.email' }),
    ]);
  });

  it('returns only the connectors on the allow-list', async () => {
    const result = await listAgentConnectors(
      createCallContext(['slack-1', 'email-1']),
      getActionsClient
    );

    expect(result).toEqual([
      { id: 'slack-1', name: 'My Slack', actionTypeId: '.slack' },
      { id: 'email-1', name: 'Ops email', actionTypeId: '.email' },
    ]);
    expect(actionsClient.getAll).toHaveBeenCalledWith({ includeSystemActions: false });
  });

  it('ignores allowed ids that the current user cannot see', async () => {
    const result = await listAgentConnectors(
      createCallContext(['slack-1', 'not-visible-to-user']),
      getActionsClient
    );

    expect(result).toEqual([{ id: 'slack-1', name: 'My Slack', actionTypeId: '.slack' }]);
  });

  it('exposes only id, name and actionTypeId, never config or secrets', async () => {
    const result = await listAgentConnectors(createCallContext(['slack-1']), getActionsClient);

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]).sort()).toEqual(['actionTypeId', 'id', 'name']);
    expect(JSON.stringify(result)).not.toContain(SECRET_WEBHOOK_URL);
    expect(JSON.stringify(result)).not.toContain('webhookUrl');
    expect(JSON.stringify(result)).not.toContain('isMissingSecrets');
  });

  it('returns an empty list when the allow-list is empty', async () => {
    const result = await listAgentConnectors(createCallContext([]), getActionsClient);

    expect(result).toEqual([]);
    expect(getActionsClient).not.toHaveBeenCalled();
    expect(actionsClient.getAll).not.toHaveBeenCalled();
  });

  it('returns an empty list when actions are not available', async () => {
    const result = await listAgentConnectors(createCallContext(['slack-1']), undefined);

    expect(result).toEqual([]);
  });

  it('returns an empty list when the actions client cannot be obtained', async () => {
    getActionsClient.mockRejectedValue(new Error('no client'));

    await expect(
      listAgentConnectors(createCallContext(['slack-1']), getActionsClient)
    ).resolves.toEqual([]);
  });

  it('returns an empty list when getAll throws', async () => {
    actionsClient.getAll.mockRejectedValue(new Error('forbidden'));

    await expect(
      listAgentConnectors(createCallContext(['slack-1']), getActionsClient)
    ).resolves.toEqual([]);
  });
});
