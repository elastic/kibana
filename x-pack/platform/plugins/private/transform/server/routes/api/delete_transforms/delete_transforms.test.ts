/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { deleteDataViewFn } from '@kbn/ml-data-view-utils/actions/delete';

import { TRANSFORM_STATE } from '../../../../common/constants';

import type { DeleteTransformsResponseSchema } from '../../api_schemas/delete_transforms';

import { deleteTransforms } from './delete_transforms';

jest.mock('@kbn/ml-data-view-utils/actions/delete', () => ({
  deleteDataViewFn: jest.fn(),
}));

const mockDeleteDataViewFn = deleteDataViewFn as jest.MockedFunction<typeof deleteDataViewFn>;

const createEsClient = (getTransform: jest.Mock, deleteTransform: jest.Mock) => ({
  transform: { getTransform, deleteTransform },
});

const createCtx = (esClient: unknown) =>
  ({ core: { elasticsearch: { client: { asCurrentUser: esClient } } } } as any);

const createRequest = (
  transformsInfo = [{ id: 'transform-1', state: TRANSFORM_STATE.STOPPED }]
) => ({
  transformsInfo,
  deleteDestIndex: false,
  deleteDestDataView: false,
  forceDelete: false,
});

describe('deleteTransforms', () => {
  beforeEach(() => {
    mockDeleteDataViewFn.mockReset();
  });

  it('returns nested timeout results when fetching the transform config times out', async () => {
    const getTransform = jest
      .fn()
      .mockResolvedValueOnce({
        transforms: [{ id: 'transform-1', dest: { index: 'transform-1-dest' } }],
      })
      .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'));
    const deleteTransform = jest.fn().mockResolvedValueOnce({});
    const response = { forbidden: jest.fn() };

    const results = (await deleteTransforms(
      createRequest([
        { id: 'transform-1', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-2', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-3', state: TRANSFORM_STATE.STOPPED },
      ]),
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    )) as DeleteTransformsResponseSchema;

    expect(results['transform-1'].transformDeleted.success).toBe(true);
    expect(results['transform-2'].transformDeleted.success).toBe(false);
    expect(results['transform-2'].transformDeleted.error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].transformDeleted.success).toBe(false);
    expect(results['transform-3'].transformDeleted.error?.reason).toMatch(/timed out/);
    expect(deleteTransform).toHaveBeenCalledTimes(1);
  });

  it('returns a failure result with an error body when fetching the transform config fails without an ES error body', async () => {
    const getTransform = jest
      .fn()
      .mockRejectedValue(new EsErrors.ConnectionError('connection reset'));
    const deleteTransform = jest.fn();
    const response = { forbidden: jest.fn() };

    const results = (await deleteTransforms(
      createRequest(),
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    )) as DeleteTransformsResponseSchema;

    expect(results['transform-1'].transformDeleted.success).toBe(false);
    expect(results['transform-1'].transformDeleted.error).toEqual(
      expect.objectContaining({ reason: 'connection reset' })
    );
    expect(deleteTransform).not.toHaveBeenCalled();
  });

  it('returns nested timeout results when deleting the transform times out', async () => {
    const getTransform = jest.fn().mockResolvedValue({
      transforms: [{ id: 'transform-1', dest: { index: 'transform-1-dest' } }],
    });
    const deleteTransform = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'));
    const response = { forbidden: jest.fn() };

    const results = (await deleteTransforms(
      createRequest([
        { id: 'transform-1', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-2', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-3', state: TRANSFORM_STATE.STOPPED },
      ]),
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    )) as DeleteTransformsResponseSchema;

    expect(results['transform-1'].transformDeleted.success).toBe(true);
    expect(results['transform-2'].transformDeleted.success).toBe(false);
    expect(results['transform-2'].transformDeleted.error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].transformDeleted.success).toBe(false);
    expect(results['transform-3'].transformDeleted.error?.reason).toMatch(/timed out/);
    expect(deleteTransform).toHaveBeenCalledTimes(2);
  });

  it('preserves a completed data view deletion when deleting the transform times out', async () => {
    const getTransform = jest.fn().mockResolvedValue({
      transforms: [{ id: 'transform-1', dest: { index: 'transform-1-dest' } }],
    });
    const deleteTransform = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'));
    const response = { forbidden: jest.fn() };
    mockDeleteDataViewFn.mockResolvedValue({ success: true });
    const request = createRequest([
      { id: 'transform-1', state: TRANSFORM_STATE.STOPPED },
      { id: 'transform-2', state: TRANSFORM_STATE.STOPPED },
      { id: 'transform-3', state: TRANSFORM_STATE.STOPPED },
    ]);
    request.deleteDestDataView = true;

    const results = (await deleteTransforms(
      request,
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    )) as DeleteTransformsResponseSchema;

    expect(results['transform-1'].destDataViewDeleted).toEqual({ success: true });
    expect(results['transform-2'].transformDeleted.success).toBe(false);
    expect(results['transform-2'].transformDeleted.error?.reason).toMatch(/timed out/);
    expect(results['transform-2'].destDataViewDeleted).toEqual({ success: true });
    expect(results['transform-3'].transformDeleted.success).toBe(false);
    expect(results['transform-3'].destDataViewDeleted).toEqual({ success: false });
    expect(mockDeleteDataViewFn).toHaveBeenCalledTimes(2);
    expect(deleteTransform).toHaveBeenCalledTimes(2);
  });

  it('returns a failure result with an error body when deleting the transform fails without an ES error body', async () => {
    const getTransform = jest.fn().mockResolvedValue({
      transforms: [{ id: 'transform-1', dest: { index: 'transform-1-dest' } }],
    });
    const deleteTransform = jest
      .fn()
      .mockRejectedValue(new EsErrors.ConnectionError('connection reset'));
    const response = { forbidden: jest.fn() };

    const results = (await deleteTransforms(
      createRequest(),
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    )) as DeleteTransformsResponseSchema;

    expect(results['transform-1'].transformDeleted.success).toBe(false);
    expect(results['transform-1'].transformDeleted.error).toEqual(
      expect.objectContaining({ reason: 'connection reset' })
    );
    expect(response.forbidden).not.toHaveBeenCalled();
  });

  it('returns a forbidden response when deleting the transform fails with 403', async () => {
    const getTransform = jest.fn().mockResolvedValue({
      transforms: [{ id: 'transform-1', dest: { index: 'transform-1-dest' } }],
    });
    const deleteTransform = jest.fn().mockRejectedValue({ statusCode: 403 });
    const response = { forbidden: jest.fn().mockReturnValue({ status: 403 }) };

    const result = await deleteTransforms(
      createRequest(),
      createCtx(createEsClient(getTransform, deleteTransform)),
      response as any,
      {} as any
    );

    expect(result).toEqual({ status: 403 });
    expect(response.forbidden).toHaveBeenCalledTimes(1);
  });
});
