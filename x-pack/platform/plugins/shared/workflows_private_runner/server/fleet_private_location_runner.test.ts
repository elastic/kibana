/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { loggerMock } from '@kbn/logging-mocks';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';
import type { Agent } from '@kbn/fleet-plugin/common';
import type { FleetActionResult } from '@kbn/fleet-plugin/server/services/actions/types';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { PrivateLocationExecuteParams } from '@kbn/stack-connectors-plugin/server';
import {
  FleetPrivateLocationRunner,
  RESULT_INDEX_PATTERN,
  WORKFLOW_HTTP_INPUT_TYPE,
} from './fleet_private_location_runner';

const buildAgent = (id: string, runnerStatus: 'HEALTHY' | 'FAILED' | undefined): Agent =>
  ({
    id,
    active: true,
    type: 'PERMANENT',
    enrolled_at: '2026-10-11T00:00:00Z',
    local_metadata: {},
    packages: [],
    components:
      runnerStatus === undefined
        ? []
        : [
            {
              id: 'workflow/http-default',
              type: WORKFLOW_HTTP_INPUT_TYPE,
              status: runnerStatus,
              message: '',
            },
          ],
  } as Agent);

const buildAck = (overrides: Partial<FleetActionResult> = {}): FleetActionResult => ({
  '@timestamp': '2026-10-11T00:00:01Z',
  action_id: 'action-id',
  action_input_type: WORKFLOW_HTTP_INPUT_TYPE,
  action_data: {},
  agent_id: 'agent-1',
  started_at: '2026-10-11T00:00:00Z',
  completed_at: '2026-10-11T00:00:01Z',
  error: '',
  action_response: { [WORKFLOW_HTTP_INPUT_TYPE]: { status_code: 200 } },
  ...overrides,
});

const buildSearchResponse = (
  source?: Record<string, unknown>
): estypes.SearchResponse<Record<string, unknown>> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    hits: source
      ? [{ _index: 'logs-workflow_runner.http-default', _id: 'id', _source: source }]
      : [],
  },
});

const okResultDoc = {
  http: {
    response: {
      status_code: 201,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
      body: { content: '{"ok":true}', truncated: false },
    },
  },
};

describe('FleetPrivateLocationRunner', () => {
  let fleet: ReturnType<typeof createFleetStartContractMock>;
  let spaces: ReturnType<typeof spacesMock.createStart>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let runner: FleetPrivateLocationRunner;
  let agentClient: ReturnType<typeof fleet.agentService.asInternalScopedUser>;
  const actionsClient = () => fleet.createFleetActionsClient(WORKFLOW_HTTP_INPUT_TYPE);

  const params = (overrides: Partial<PrivateLocationExecuteParams> = {}) => ({
    privateLocation: 'internal-net',
    connectorId: 'connector-1',
    kibanaRequest: httpServerMock.createKibanaRequest(),
    request: {
      method: 'POST',
      url: 'https://jenkins.internal/hook',
      headers: { Authorization: 'Basic abc' },
      body: '{"event":"deploy"}',
      maxRedirects: 5,
      timeoutSeconds: 30,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    fleet = createFleetStartContractMock();
    spaces = spacesMock.createStart();
    spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('ops'));
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    agentClient = fleet.agentService.asInternalScopedUser('ops');
    jest.mocked(fleet.agentService.asInternalScopedUser).mockReturnValue(agentClient);
    jest.mocked(agentClient.listAgents).mockResolvedValue({
      agents: [buildAgent('agent-1', 'HEALTHY')],
      total: 1,
      page: 1,
      perPage: 100,
    });
    jest.mocked(actionsClient().create).mockImplementation(async (action) => action);
    jest
      .mocked(actionsClient().getResultsByIds)
      .mockResolvedValue({ items: [buildAck()], total: 1 });
    esClient.search.mockResolvedValue(buildSearchResponse(okResultDoc));

    runner = new FleetPrivateLocationRunner({
      logger: loggerMock.create(),
      getStartServices: async () => ({ fleet, spaces, esClient }),
    });
  });

  test('sends an INPUT_ACTION to a healthy agent in the space and returns the response', async () => {
    const response = await runner.execute(params());

    expect(fleet.agentService.asInternalScopedUser).toHaveBeenCalledWith('ops');
    expect(agentClient.listAgents).toHaveBeenCalledWith({
      kuery: 'policy_id:internal-net and status:online',
      showInactive: false,
      perPage: 100,
    });
    expect(actionsClient().create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INPUT_ACTION',
        input_type: WORKFLOW_HTTP_INPUT_TYPE,
        agents: ['agent-1'],
        timeout: 30,
        data: {
          space_id: 'ops',
          request: {
            method: 'POST',
            url: 'https://jenkins.internal/hook',
            headers: { Authorization: 'Basic abc' },
            body: '{"event":"deploy"}',
            max_redirects: 5,
          },
        },
      })
    );
    const { action_id: actionId } = jest.mocked(actionsClient().create).mock.calls[0][0];
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: RESULT_INDEX_PATTERN,
        query: { ids: { values: [actionId] } },
      })
    );
    expect(response).toEqual({
      statusCode: 201,
      headers: { 'content-type': 'application/json', 'retry-after': '5' },
      body: '{"ok":true}',
      bodyTruncated: false,
    });
  });

  test('skips agents without a healthy workflow runner', async () => {
    jest.mocked(agentClient.listAgents).mockResolvedValue({
      agents: [
        buildAgent('no-runner', undefined),
        buildAgent('failed-runner', 'FAILED'),
        buildAgent('agent-2', 'HEALTHY'),
      ],
      total: 3,
      page: 1,
      perPage: 100,
    });

    await runner.execute(params());

    expect(actionsClient().create).toHaveBeenCalledWith(
      expect.objectContaining({ agents: ['agent-2'] })
    );
  });

  test('escapes the private location in the agent query', async () => {
    await runner.execute(params({ privateLocation: 'a" or policy_id:*' }));

    expect(agentClient.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'policy_id:a\\" \\or policy_id\\:\\* and status:online',
      })
    );
  });

  test('fails when no agent can run the request', async () => {
    jest.mocked(agentClient.listAgents).mockResolvedValue({
      agents: [buildAgent('failed-runner', 'FAILED')],
      total: 1,
      page: 1,
      perPage: 100,
    });

    await expect(runner.execute(params())).rejects.toThrow(
      'no online agent with a healthy workflow runner in private location "internal-net"'
    );
    expect(actionsClient().create).not.toHaveBeenCalled();
  });

  test('uses the default space when spaces is unavailable', async () => {
    runner = new FleetPrivateLocationRunner({
      logger: loggerMock.create(),
      getStartServices: async () => ({ fleet, esClient }),
    });

    await runner.execute(params());

    expect(fleet.agentService.asInternalScopedUser).toHaveBeenCalledWith('default');
  });

  test('fails with the agent error when the request did not reach the target', async () => {
    jest.mocked(actionsClient().getResultsByIds).mockResolvedValue({
      items: [
        buildAck({ error: 'dial tcp: lookup jenkins.internal: no such host', action_response: {} }),
      ],
      total: 1,
    });

    await expect(runner.execute(params())).rejects.toThrow(
      'agent "agent-1" failed the request: dial tcp: lookup jenkins.internal: no such host'
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  test('waits until the ack and the result document are available', async () => {
    jest
      .mocked(actionsClient().getResultsByIds)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValue({ items: [buildAck()], total: 1 });
    esClient.search
      .mockResolvedValueOnce(buildSearchResponse())
      .mockResolvedValue(buildSearchResponse(okResultDoc));

    const response = await runner.execute(params());

    expect(actionsClient().getResultsByIds).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(201);
  });

  test('fails with the result error when the agent got no response', async () => {
    esClient.search.mockResolvedValue(
      buildSearchResponse({ error: { message: 'context deadline exceeded' } })
    );

    await expect(runner.execute(params())).rejects.toThrow('context deadline exceeded');
  });

  test('times out when the agent never acks', async () => {
    jest.mocked(actionsClient().getResultsByIds).mockResolvedValue({ items: [], total: 0 });
    const start = Date.now();
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(start)
      .mockReturnValue(start + 10 * 60 * 1000);

    await expect(runner.execute(params())).rejects.toThrow(
      /timed out waiting for private location "internal-net" to run action/
    );
  });

  test('stops waiting when the connector execution is aborted', async () => {
    jest.mocked(actionsClient().getResultsByIds).mockResolvedValue({ items: [], total: 0 });
    const controller = new AbortController();
    const execution = runner.execute(params({ signal: controller.signal }));
    controller.abort();

    await expect(execution).rejects.toThrow(/aborted/i);
  });
});
