/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveCpsData } from './resolve_cps_data';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

const esClient = elasticsearchServiceMock.createElasticsearchClient();
const logger = loggingSystemMock.createLogger();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveCpsData', () => {
  it('returns resolved expression and linked projects on success', async () => {
    esClient.transport.request
      .mockResolvedValueOnce({
        kibana_space_default_default: { expression: '_alias:my-project' },
      })
      .mockResolvedValueOnce({
        linked_projects: {
          proj1: { _id: 'p1', _alias: 'alias1', _type: 'type1', _organisation: 'org1' },
        },
      });

    const result = await resolveCpsData(esClient, 'default', logger);

    expect(result).toEqual({
      resolvedExpression: '_alias:my-project',
      linkedProjects: [{ id: 'p1', alias: 'alias1', type: 'type1', organization: 'org1' }],
    });
  });

  it('falls back to PROJECT_ROUTING_ALL on 404', async () => {
    esClient.transport.request
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce({ linked_projects: {} });

    const result = await resolveCpsData(esClient, 'default', logger);

    expect(result).toEqual({
      resolvedExpression: PROJECT_ROUTING_ALL,
      linkedProjects: [],
    });
  });

  it('returns empty linkedProjects and logs warning on unexpected error', async () => {
    esClient.transport.request.mockRejectedValueOnce(new Error('connection refused'));

    const result = await resolveCpsData(esClient, 'default', logger);

    expect(result).toEqual({ linkedProjects: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to resolve CPS data'));
  });

  it('resolves the correct NPRE for a custom space', async () => {
    esClient.transport.request
      .mockResolvedValueOnce({
        kibana_space_my_space_default: { expression: '_alias:custom-project' },
      })
      .mockResolvedValueOnce({
        linked_projects: {
          proj1: { _id: 'c1', _alias: 'custom', _type: 'typeC', _organisation: 'orgC' },
        },
      });

    const result = await resolveCpsData(esClient, 'my_space', logger);

    expect(esClient.transport.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/_project_routing/kibana_space_my_space_default' })
    );
    expect(result).toEqual({
      resolvedExpression: '_alias:custom-project',
      linkedProjects: [{ id: 'c1', alias: 'custom', type: 'typeC', organization: 'orgC' }],
    });
  });

  it('returns empty linkedProjects when tags request fails', async () => {
    esClient.transport.request
      .mockResolvedValueOnce({
        kibana_space_default_default: { expression: '_alias:*' },
      })
      .mockRejectedValueOnce(new Error('tags failed'));

    const result = await resolveCpsData(esClient, 'default', logger);

    expect(result).toEqual({
      resolvedExpression: '_alias:*',
      linkedProjects: [],
    });
  });
});
