/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateTransform } from './update_transform';

describe('updateTransform', () => {
  const createEsClient = () =>
    ({
      transform: {
        getTransform: jest.fn().mockResolvedValue({
          transforms: [
            {
              source: {
                index: ['source-index'],
                query: { term: { status: 'active' } },
                runtime_mappings: {
                  runtime_field: {
                    type: 'keyword',
                    script: {
                      source: "emit('old')",
                    },
                  },
                },
              },
            },
          ],
        }),
        updateTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as any);

  it('updates the transform with the provided current-user client', async () => {
    const esClient = createEsClient();

    await updateTransform({
      body: { description: 'updated' },
      esClient,
      transformId: 'transform-id',
    });

    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { description: 'updated' },
      transform_id: 'transform-id',
    });
    expect(esClient.transform.getTransform).not.toHaveBeenCalled();
  });

  it('merges partial source updates with the existing source config', async () => {
    const esClient = createEsClient();

    await updateTransform({
      body: { source: { project_routing: '_id:linked-id' } },
      esClient,
      transformId: 'transform-id',
    });

    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: {
        source: {
          index: ['source-index'],
          query: { term: { status: 'active' } },
          runtime_mappings: {
            runtime_field: {
              type: 'keyword',
              script: {
                source: "emit('old')",
              },
            },
          },
          project_routing: '_id:linked-id',
        },
      },
      transform_id: 'transform-id',
    });
  });

  it('preserves full source replacement behavior when source index is provided', async () => {
    const esClient = createEsClient();

    await updateTransform({
      body: { source: { index: ['new-source-index'] } },
      esClient,
      transformId: 'transform-id',
    });

    expect(esClient.transform.getTransform).not.toHaveBeenCalled();
    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { source: { index: ['new-source-index'] } },
      transform_id: 'transform-id',
    });
  });

  it('fails the update when fetching the existing source config fails', async () => {
    const esClient = createEsClient();
    esClient.transform.getTransform.mockRejectedValue(new Error('get transform failed'));

    await expect(
      updateTransform({
        body: { source: { project_routing: '_id:linked-id' } },
        esClient,
        transformId: 'transform-id',
      })
    ).rejects.toThrow('get transform failed');
    expect(esClient.transform.updateTransform).not.toHaveBeenCalled();
  });
});
