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

import { getDeprecatedILMCheckHandler } from './handlers';

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

  it('should return empty array when no component templates use deprecated ILM policies', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      'logs@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      'metrics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
      'synthetics@lifecycle': { version: 1, modified_date: '', policy: { phases: {} } },
    });

    // Component templates don't use any ILM policies
    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {},
            },
          },
        },
      ],
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

    // Component template uses deprecated policy
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

    mockEsClient.cluster.getComponentTemplate
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        component_templates: [],
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

  it('should only fetch Fleet-managed component templates (with @package suffix)', async () => {
    mockEsClient.ilm.getLifecycle.mockResolvedValue({
      logs: { version: 1, modified_date: '', policy: { phases: {} } },
      metrics: { version: 1, modified_date: '', policy: { phases: {} } },
      synthetics: { version: 1, modified_date: '', policy: { phases: {} } },
    });

    mockEsClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [],
    });

    await getDeprecatedILMCheckHandler(context, request, response);

    // Verify that we made 3 calls for logs-*@package, metrics-*@package, synthetics-*@package
    expect(mockEsClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(3);
    expect(mockEsClient.cluster.getComponentTemplate).toHaveBeenCalledWith({
      name: 'logs-*@package',
    });
    expect(mockEsClient.cluster.getComponentTemplate).toHaveBeenCalledWith({
      name: 'metrics-*@package',
    });
    expect(mockEsClient.cluster.getComponentTemplate).toHaveBeenCalledWith({
      name: 'synthetics-*@package',
    });
  });
});
