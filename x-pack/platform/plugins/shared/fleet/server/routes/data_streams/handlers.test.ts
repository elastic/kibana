/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

import { getDeprecatedILMCheckHandler, getListHandler } from './handlers';
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
