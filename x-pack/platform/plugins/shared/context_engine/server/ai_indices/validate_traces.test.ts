/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AgentsStart, AgentRegistry } from '@kbn/agent-builder-server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AiIndexTrace } from '../../common/http_api/ai_indices';
import { InvalidAiIndexTraceError } from './errors';
import { validateTraces } from './validate_traces';

const esResponseError = (statusCode: number) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'response_error', reason: `status ${statusCode}` } },
    })
  );

const emptyResolve = { indices: [], aliases: [], data_streams: [] };

const createAgents = (
  has: AgentRegistry['has']
): {
  agents: Pick<AgentsStart, 'getRegistry'>;
  getRegistry: jest.MockedFunction<AgentsStart['getRegistry']>;
} => {
  const getRegistry: jest.MockedFunction<AgentsStart['getRegistry']> = jest.fn().mockResolvedValue({
    has,
    get: async () => {
      throw new Error('unused');
    },
    list: async () => [],
    create: async () => {
      throw new Error('unused');
    },
    update: async () => {
      throw new Error('unused');
    },
    delete: async () => false,
  });

  return { agents: { getRegistry }, getRegistry };
};

describe('validateTraces', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const request = httpServerMock.createKibanaRequest();

  const validate = ({
    traces,
    agents,
  }: {
    traces: AiIndexTrace[];
    agents?: Pick<AgentsStart, 'getRegistry'>;
  }) => validateTraces({ traces, esClient, agents, request });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.resolveIndex.mockResolvedValue(emptyResolve);
  });

  it('accepts an agent that exists in the registry', async () => {
    const has = jest.fn().mockResolvedValue(true);
    const { agents, getRegistry } = createAgents(has);

    await expect(
      validate({ traces: [{ type: 'elastic_agent', value: 'support-agent' }], agents })
    ).resolves.toBeUndefined();

    expect(has).toHaveBeenCalledWith('support-agent');
    expect(getRegistry).toHaveBeenCalledWith({ request });
  });

  it('rejects an agent that is not in the registry', async () => {
    const { agents } = createAgents(jest.fn().mockResolvedValue(false));

    await expect(
      validate({ traces: [{ type: 'elastic_agent', value: 'missing-agent' }], agents })
    ).rejects.toThrow(new InvalidAiIndexTraceError(`Agent 'missing-agent' was not found`));
  });

  it('builds the registry once for multiple agent traces', async () => {
    const has = jest.fn().mockResolvedValue(true);
    const { agents, getRegistry } = createAgents(has);

    await validate({
      traces: [
        { type: 'elastic_agent', value: 'agent-one' },
        { type: 'elastic_agent', value: 'agent-two' },
      ],
      agents,
    });

    expect(getRegistry).toHaveBeenCalledTimes(1);
    expect(has).toHaveBeenCalledTimes(2);
  });

  it('skips agent lookup when Agent Builder is unavailable', async () => {
    await expect(
      validate({ traces: [{ type: 'elastic_agent', value: 'any-agent' }] })
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      target: 'indices',
      resolved: {
        indices: [{ name: 'logs-default', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      },
    },
    {
      target: 'data_streams',
      resolved: {
        indices: [],
        aliases: [],
        data_streams: [{ name: 'logs-app', backing_indices: [], timestamp_field: '@timestamp' }],
      },
    },
    {
      target: 'aliases',
      resolved: {
        indices: [],
        aliases: [{ name: 'logs-alias', indices: ['logs-1'] }],
        data_streams: [],
      },
    },
  ])('accepts an index expression that resolves via $target', async ({ resolved }) => {
    esClient.indices.resolveIndex.mockResolvedValue(resolved);

    await expect(
      validate({ traces: [{ type: 'index', value: 'logs-*' }] })
    ).resolves.toBeUndefined();

    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: 'logs-*',
      expand_wildcards: ['open', 'hidden', 'closed'],
    });
  });

  it('rejects a multi-expression value when one expression does not resolve', async () => {
    esClient.indices.resolveIndex.mockImplementation(async ({ name }) => {
      if (name === 'logs-*') {
        return {
          indices: [{ name: 'logs-default', attributes: ['open'] }],
          aliases: [],
          data_streams: [],
        };
      }
      return emptyResolve;
    });

    await expect(
      validate({ traces: [{ type: 'index', value: 'logs-*,missing-index' }] })
    ).rejects.toThrow(
      new InvalidAiIndexTraceError(
        `Index trace 'missing-index' does not match any index, data stream, or alias`
      )
    );
  });

  it('rejects an empty expression', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'logs-default', attributes: ['open'] }],
      aliases: [],
      data_streams: [],
    });

    await expect(validate({ traces: [{ type: 'index', value: 'logs-*,' }] })).rejects.toThrow(
      new InvalidAiIndexTraceError('Index trace value cannot contain an empty expression')
    );

    expect(esClient.indices.resolveIndex).toHaveBeenCalledTimes(1);
    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: 'logs-*',
      expand_wildcards: ['open', 'hidden', 'closed'],
    });
  });

  it('rejects when resolveIndex returns 404', async () => {
    esClient.indices.resolveIndex.mockRejectedValue(esResponseError(404));

    await expect(validate({ traces: [{ type: 'index', value: 'no-such-index' }] })).rejects.toThrow(
      new InvalidAiIndexTraceError(
        `Index trace 'no-such-index' does not match any index, data stream, or alias`
      )
    );
  });

  it('rejects when resolveIndex returns 400', async () => {
    esClient.indices.resolveIndex.mockRejectedValue(esResponseError(400));

    await expect(validate({ traces: [{ type: 'index', value: 'bad|index' }] })).rejects.toThrow(
      new InvalidAiIndexTraceError(
        `Index trace 'bad|index' does not match any index, data stream, or alias`
      )
    );
  });

  it('rethrows non-ES errors from resolveIndex', async () => {
    esClient.indices.resolveIndex.mockRejectedValue(new Error('socket hang up'));

    await expect(validate({ traces: [{ type: 'index', value: 'logs-*' }] })).rejects.toThrow(
      'socket hang up'
    );
  });

  it('ignores esql traces', async () => {
    const has = jest.fn();
    const { agents, getRegistry } = createAgents(has);

    await expect(
      validate({
        traces: [{ type: 'esql', value: 'FROM traces-* | LIMIT 10' }],
        agents,
      })
    ).resolves.toBeUndefined();

    expect(has).not.toHaveBeenCalled();
    expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    expect(getRegistry).not.toHaveBeenCalled();
  });
});
