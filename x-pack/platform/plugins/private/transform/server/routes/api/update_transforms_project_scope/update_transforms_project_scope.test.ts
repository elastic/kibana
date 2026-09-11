/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateTransformsProjectScope } from './update_transforms_project_scope';

describe('updateTransformsProjectScope', () => {
  const createTransform = (id: string) => ({
    id,
    source: {
      index: [`${id}-source`],
      query: { match_all: {} },
      runtime_mappings: {
        runtime_field: {
          type: 'keyword',
          script: {
            source: "emit('value')",
          },
        },
      },
    },
  });

  const createEsClient = (transforms = [createTransform('transform-1')]) =>
    ({
      transform: {
        getTransform: jest.fn().mockResolvedValue({ transforms }),
        updateTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as any);

  it('fetches transforms in batches and updates each transform with its full source config', async () => {
    const transforms = Array.from({ length: 101 }, (_, index) =>
      createTransform(`transform-${index + 1}`)
    );
    const esClient = createEsClient(transforms);

    const results = await updateTransformsProjectScope(
      {
        projectRouting: '_id:linked-project',
        transformsInfo: transforms.map(({ id }) => ({ id })),
      },
      esClient
    );

    expect(esClient.transform.getTransform).toHaveBeenCalledTimes(2);
    expect(esClient.transform.updateTransform).toHaveBeenCalledTimes(101);
    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: {
        source: {
          ...transforms[0].source,
          project_routing: '_id:linked-project',
        },
      },
      transform_id: 'transform-1',
    });
    expect(results['transform-1']).toEqual({ success: true });
    expect(results['transform-101']).toEqual({ success: true });
  });

  it('returns a failure result when a requested transform is missing', async () => {
    const esClient = createEsClient([createTransform('transform-1')]);

    const results = await updateTransformsProjectScope(
      {
        projectRouting: '_id:linked-project',
        transformsInfo: [{ id: 'transform-1' }, { id: 'missing-transform' }],
      },
      esClient
    );

    expect(results['transform-1']).toEqual({ success: true });
    expect(results['missing-transform']).toMatchObject({
      success: false,
      error: {
        type: 'resource_not_found_exception',
      },
    });
  });

  it('updates transforms with ids that match inherited object properties', async () => {
    const transform = createTransform('constructor');
    const esClient = createEsClient([transform]);

    const results = await updateTransformsProjectScope(
      {
        projectRouting: '_id:linked-project',
        transformsInfo: [{ id: 'constructor' }],
      },
      esClient
    );

    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: {
        source: {
          ...transform.source,
          project_routing: '_id:linked-project',
        },
      },
      transform_id: 'constructor',
    });
    expect(Object.prototype.hasOwnProperty.call(results, 'constructor')).toBe(true);
    expect(results.constructor).toEqual({ success: true });
  });

  it('falls back to per-transform fetches when a batch fetch fails because one transform is missing', async () => {
    const esClient = createEsClient();
    esClient.transform.getTransform
      .mockRejectedValueOnce({
        meta: {
          body: {
            error: {
              type: 'resource_not_found_exception',
              reason: 'Transform missing-transform could not be found.',
              root_cause: [],
              caused_by: {},
              response: {},
            },
          },
        },
      })
      .mockResolvedValueOnce({ transforms: [createTransform('transform-1')] })
      .mockRejectedValueOnce({
        meta: {
          body: {
            error: {
              type: 'resource_not_found_exception',
              reason: 'Transform missing-transform could not be found.',
              root_cause: [],
              caused_by: {},
              response: {},
            },
          },
        },
      })
      .mockResolvedValueOnce({ transforms: [createTransform('transform-2')] });

    const results = await updateTransformsProjectScope(
      {
        projectRouting: '_id:linked-project',
        transformsInfo: [{ id: 'transform-1' }, { id: 'missing-transform' }, { id: 'transform-2' }],
      },
      esClient
    );

    expect(esClient.transform.getTransform).toHaveBeenCalledTimes(4);
    expect(esClient.transform.getTransform).toHaveBeenNthCalledWith(1, {
      allow_no_match: true,
      size: 3,
      transform_id: 'transform-1,missing-transform,transform-2',
    });
    expect(esClient.transform.updateTransform).toHaveBeenCalledTimes(2);
    expect(results['transform-1']).toEqual({ success: true });
    expect(results['transform-2']).toEqual({ success: true });
    expect(results['missing-transform']).toMatchObject({
      success: false,
      error: {
        type: 'resource_not_found_exception',
      },
    });
  });

  it('returns a per-transform failure result when an update fails', async () => {
    const esClient = createEsClient([
      createTransform('transform-1'),
      createTransform('transform-2'),
    ]);
    esClient.transform.updateTransform
      .mockResolvedValueOnce({ acknowledged: true })
      .mockRejectedValueOnce({
        meta: {
          body: {
            error: {
              type: 'status_exception',
              reason: 'update failed',
              root_cause: [],
              caused_by: {},
              response: {},
            },
          },
        },
      });

    const results = await updateTransformsProjectScope(
      {
        projectRouting: '_id:linked-project',
        transformsInfo: [{ id: 'transform-1' }, { id: 'transform-2' }],
      },
      esClient
    );

    expect(results['transform-1']).toEqual({ success: true });
    expect(results['transform-2']).toMatchObject({
      success: false,
      error: {
        reason: 'update failed',
      },
    });
  });
});
