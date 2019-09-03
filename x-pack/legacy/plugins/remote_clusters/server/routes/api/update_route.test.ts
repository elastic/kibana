/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { wrapCustomError } from '../../../../../server/lib/create_router';
import { updateHandler } from './update_route';

describe('[API Routes] Remote Clusters updateHandler()', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  it('returns the cluster information from Elasticsearch', async () => {
    const mockCreateRequest = ({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                seeds: [],
              },
            },
          },
        },
      });

    const response = await updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit);
    const expectedResponse = {
      name: 'test_cluster',
      seeds: [],
      isConfiguredByNode: false,
    };
    expect(response).toEqual(expectedResponse);
  });

  it(`throws an error if the response doesn't contain cluster information`, async () => {
    const mockCreateRequest = ({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {},
      });

    const expectedError = wrapCustomError(
      new Error('Unable to update cluster, no response returned from ES.'),
      400
    );
    await expect(
      updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(expectedError);
  });

  it('throws an error if the cluster does not exist', async () => {
    const mockCreateRequest = ({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest.fn().mockReturnValueOnce({});

    const expectedError = wrapCustomError(
      new Error('There is no remote cluster with that name.'),
      404
    );
    await expect(
      updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(expectedError);
  });

  it('throws an ES error when one is received', async () => {
    const mockCreateRequest = ({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      },
    } as unknown) as Request;

    const mockError = new Error() as any;
    mockError.response = JSON.stringify({ error: 'Test error' });

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockRejectedValueOnce(mockError);

    await expect(
      updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(mockError);
  });
});
