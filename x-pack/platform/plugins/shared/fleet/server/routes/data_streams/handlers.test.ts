/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';

import type { FleetRequestHandlerContext } from '../..';

jest.mock('../../services/data_streams');
jest.mock('../../services/epm/packages/get');
jest.mock('../../services');
jest.mock('./get_data_streams_query_metadata');

import { dataStreamService } from '../../services/data_streams';
import { getPackageSavedObjects } from '../../services/epm/packages/get';
import { appContextService } from '../../services';

import { FleetUnauthorizedError } from '../../errors';

import { getDeprecatedILMCheckHandler, getListHandler, getHasDataHandler } from './handlers';
import { getDataStreamsQueryMetadata } from './get_data_streams_query_metadata';

describe('getListHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: jest.Mocked<KibanaRequest>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const createDataStreamInfo = (name: string) => ({
    name,
    timestamp_field: { name: '@timestamp' },
    indices: [{ index_name: `${name}-000001`, index_uuid: 'uuid' }],
    generation: 1,
    _meta: { managed_by: 'fleet' },
    status: 'open',
    template: 'logs',
    hidden: false,
  });

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest() as jest.Mocked<KibanaRequest>;

    jest.mocked(appContextService.getConfig).mockReturnValue({
      internal: { useMeteringApi: true },
    } as any);

    jest
      .mocked(dataStreamService.getAllFleetDataStreams)
      .mockResolvedValue([
        createDataStreamInfo('logs-nginx.access-default'),
        createDataStreamInfo('.ds-logs-system-default'),
        createDataStreamInfo('.workflows-events'),
      ] as any);

    jest.mocked(dataStreamService.getAllFleetMeteringStats).mockResolvedValue([
      { name: 'logs-nginx.access-default', num_docs: 1, size_in_bytes: 100 },
      { name: '.ds-logs-system-default', num_docs: 1, size_in_bytes: 100 },
      { name: '.workflows-events', num_docs: 1, size_in_bytes: 100 },
    ]);

    jest.mocked(getPackageSavedObjects).mockResolvedValue({
      saved_objects: [],
    } as any);

    jest.mocked(getDataStreamsQueryMetadata).mockResolvedValue({
      maxIngested: Date.now(),
      namespace: 'default',
      dataset: 'nginx.access',
      type: 'logs',
      serviceNames: [],
      environments: [],
    });

    context = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
            asSecondaryAuthUser: mockEsClient,
          },
        },
        savedObjects: {
          client: {
            bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
          },
        },
      },
    } as unknown as FleetRequestHandlerContext;
  });

  it('filters out data streams that start with "."', async () => {
    await getListHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const [call] = jest.mocked(response.ok).mock.calls;
    const body = call[0]?.body as { data_streams: Array<{ index: string }> };
    expect(body.data_streams).toHaveLength(1);
    expect(body.data_streams[0].index).toBe('logs-nginx.access-default');
    expect(body.data_streams.every((ds) => !ds.index.startsWith('.'))).toBe(true);
  });
});

describe('getDeprecatedILMCheckHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: jest.Mocked<KibanaRequest>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    response = httpServerMock.createResponseFactory();
    request = httpServerMock.createKibanaRequest() as jest.Mocked<KibanaRequest>;

    context = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      },
    } as unknown as FleetRequestHandlerContext;
  });

  it('should return empty array when no Fleet-managed templates use deprecated ILM policies', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      'metrics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [],
      },
    });
  });

  it('should return empty array when both deprecated and @lifecycle policies are unmodified (version 1)', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      'metrics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      ],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    // Should not show callout because auto-migration will handle this
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [],
      },
    });
  });

  it('should return deprecated policy when using deprecated policy without @lifecycle existing', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      // No @lifecycle policies exist
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      ],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [
          {
            policyName: 'logs',
            version: 1,
            componentTemplates: ['logs-test@package'],
          },
        ],
      },
    });
  });

  it('should return deprecated policy when deprecated policy is modified (version > 1)', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 2, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      'metrics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      ],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [
          {
            policyName: 'logs',
            version: 2,
            componentTemplates: ['logs-test@package'],
          },
        ],
      },
    });
  });

  it('should return deprecated policy when @lifecycle policy is modified (version > 1)', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 2, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      'metrics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      ],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [
          {
            policyName: 'logs',
            version: 1,
            componentTemplates: ['logs-test@package'],
          },
        ],
      },
    });
  });

  it('should handle multiple deprecated policies across different types', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 2, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      // metrics@lifecycle doesn't exist
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockImplementation((params: any) => {
      if (params.name === 'logs-*@package') {
        return Promise.resolve({
          component_templates: [
            {
              name: 'logs-test@package',
              component_template: {
                template: {
                  settings: {
                    index: {
                      lifecycle: {
                        name: 'logs',
                      },
                    },
                  },
                },
              },
            },
          ],
        });
      } else if (params.name === 'metrics-*@package') {
        return Promise.resolve({
          component_templates: [
            {
              name: 'metrics-test@package',
              component_template: {
                template: {
                  settings: {
                    index: {
                      lifecycle: {
                        name: 'metrics',
                      },
                    },
                  },
                },
              },
            },
          ],
        });
      }
      return Promise.resolve({ component_templates: [] });
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [
          {
            policyName: 'logs',
            version: 2,
            componentTemplates: ['logs-test@package'],
          },
          {
            policyName: 'metrics',
            version: 1,
            componentTemplates: ['metrics-test@package'],
          },
        ],
      },
    });
  });

  it('should only consider Fleet-managed component templates (with @package suffix)', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 2, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
    });

    // getComponentTemplate with name='logs-*@package' will only return @package templates
    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      ],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    // Should only include the @package template
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        deprecatedILMPolicies: [
          {
            policyName: 'logs',
            version: 2,
            componentTemplates: ['logs-test@package'],
          },
        ],
      },
    });
  });
});

describe('getHasDataHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const makeRequest = (query: { dataStreams: string; start: string }) =>
    httpServerMock.createKibanaRequest({ query }) as jest.Mocked<KibanaRequest>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    response = httpServerMock.createResponseFactory();

    context = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      },
    } as unknown as FleetRequestHandlerContext;
  });

  it('rejects an invalid index pattern', async () => {
    const request = makeRequest({ dataStreams: 'bad-pattern', start: '2025-01-01T00:00:00Z' });

    await getHasDataHandler(context, request, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid index pattern: "bad-pattern"' },
    });
    expect(mockEsClient.msearch).not.toHaveBeenCalled();
  });

  it('rejects a pattern with arbitrary index name (security boundary)', async () => {
    const request = makeRequest({ dataStreams: '.security-7', start: '2025-01-01T00:00:00Z' });

    await getHasDataHandler(context, request, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid index pattern: ".security-7"' },
    });
    expect(mockEsClient.msearch).not.toHaveBeenCalled();
  });

  it('rejects when only one pattern in the list is invalid', async () => {
    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*,.security-7',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid index pattern: ".security-7"' },
    });
    expect(mockEsClient.msearch).not.toHaveBeenCalled();
  });

  it('returns results with true for patterns with hits and false for empty', async () => {
    mockEsClient.msearch.mockResolvedValue({
      responses: [{ hits: { total: { value: 5 } } }, { hits: { total: { value: 0 } } }],
    } as any);

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*,metrics-aws.ec2-*',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: {
          'logs-aws.vpcflow-*': true,
          'metrics-aws.ec2-*': false,
        },
      },
    });
  });

  it('returns false for a pattern whose msearch response is an error', async () => {
    mockEsClient.msearch.mockResolvedValue({
      responses: [{ error: { type: 'index_not_found_exception' } }],
    } as any);

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { results: { 'logs-aws.vpcflow-*': false } },
    });
  });

  it('returns false for all patterns when a no-shard error is thrown', async () => {
    const noShardError = new errors.ResponseError({
      statusCode: 503,
      body: {
        error: {
          type: 'search_phase_execution_exception',
          root_cause: [{ type: 'no_shard_available_action_exception' }],
        },
      },
      headers: {},
      meta: {} as any,
      warnings: null,
    } as any);
    mockEsClient.msearch.mockRejectedValue(noShardError);

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { results: { 'logs-aws.vpcflow-*': false } },
    });
  });

  it('rethrows errors that are not no-shard errors', async () => {
    mockEsClient.msearch.mockRejectedValue(new Error('boom'));

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });

    await expect(getHasDataHandler(context, request, response)).rejects.toThrow('boom');
  });

  describe('permission errors', () => {
    const makeSecurityError = (body: any) =>
      new errors.ResponseError({
        statusCode: 403,
        body,
        headers: {},
        meta: {} as any,
        warnings: null,
      } as any);

    it('throws FleetUnauthorizedError for a per-response security_exception', async () => {
      // msearch reports per-index failures on the response item rather than throwing.
      mockEsClient.msearch.mockResolvedValue({
        responses: [{ error: { type: 'security_exception', reason: 'denied' } }],
      } as any);

      const request = makeRequest({
        dataStreams: 'logs-aws.vpcflow-*',
        start: '2025-01-01T00:00:00Z',
      });

      await expect(getHasDataHandler(context, request, response)).rejects.toThrow(
        FleetUnauthorizedError
      );
      // Must not be reported as "no data".
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('throws FleetUnauthorizedError when a security_exception is nested in root_cause', async () => {
      mockEsClient.msearch.mockResolvedValue({
        responses: [
          {
            error: {
              type: 'search_phase_execution_exception',
              root_cause: [{ type: 'security_exception', reason: 'denied' }],
            },
          },
        ],
      } as any);

      const request = makeRequest({
        dataStreams: 'logs-aws.vpcflow-*',
        start: '2025-01-01T00:00:00Z',
      });

      await expect(getHasDataHandler(context, request, response)).rejects.toThrow(
        FleetUnauthorizedError
      );
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('throws FleetUnauthorizedError for a top-level security_exception', async () => {
      mockEsClient.msearch.mockRejectedValue(
        makeSecurityError({ error: { type: 'security_exception', reason: 'denied' } })
      );

      const request = makeRequest({
        dataStreams: 'logs-aws.vpcflow-*',
        start: '2025-01-01T00:00:00Z',
      });

      await expect(getHasDataHandler(context, request, response)).rejects.toThrow(
        FleetUnauthorizedError
      );
    });

    it('still reports false for non-permission per-response errors', async () => {
      mockEsClient.msearch.mockResolvedValue({
        responses: [{ error: { type: 'index_not_found_exception' } }],
      } as any);

      const request = makeRequest({
        dataStreams: 'logs-aws.vpcflow-*',
        start: '2025-01-01T00:00:00Z',
      });

      await getHasDataHandler(context, request, response);

      expect(response.ok).toHaveBeenCalledWith({
        body: { results: { 'logs-aws.vpcflow-*': false } },
      });
    });

    it('fails the whole request when one pattern of several is denied', async () => {
      mockEsClient.msearch.mockResolvedValue({
        responses: [
          { hits: { total: { value: 1 } } },
          { error: { type: 'security_exception', reason: 'denied' } },
        ],
      } as any);

      const request = makeRequest({
        dataStreams: 'logs-aws.vpcflow-*,metrics-aws.ec2-*',
        start: '2025-01-01T00:00:00Z',
      });

      await expect(getHasDataHandler(context, request, response)).rejects.toThrow(
        FleetUnauthorizedError
      );
    });
  });

  it('builds the correct msearch body — one header+body pair per pattern', async () => {
    mockEsClient.msearch.mockResolvedValue({
      responses: [{ hits: { total: { value: 0 } } }],
    } as any);

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    const { searches } = jest.mocked(mockEsClient.msearch).mock.calls[0][0] as any;
    expect(searches).toHaveLength(2); // 1 pattern × 2 items (header + body)
    expect(searches[0]).toMatchObject({ index: 'logs-aws.vpcflow-*', ignore_unavailable: true });
    expect(searches[1]).toMatchObject({ size: 0, terminate_after: 1 });
    expect(searches[1].query.bool.filter).toEqual([
      { range: { '@timestamp': { gte: '2025-01-01T00:00:00Z' } } },
    ]);
  });

  it('trims whitespace around comma-separated patterns', async () => {
    mockEsClient.msearch.mockResolvedValue({
      responses: [{ hits: { total: { value: 1 } } }, { hits: { total: { value: 1 } } }],
    } as any);

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-* , metrics-aws.ec2-*',
      start: '2025-01-01T00:00:00Z',
    });

    await getHasDataHandler(context, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: {
          'logs-aws.vpcflow-*': true,
          'metrics-aws.ec2-*': true,
        },
      },
    });
  });
});
