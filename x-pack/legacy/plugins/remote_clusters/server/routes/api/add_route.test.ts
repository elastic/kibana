/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit } from 'hapi';
import { wrapCustomError } from '../../../../../server/lib/create_router';
import { addHandler } from './add_route';

describe('[API Routes] Remote Clusters addHandler()', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  it('returns success', async () => {
    const mockCreateRequest = ({
      payload: {
        name: 'test_cluster',
        seeds: [],
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                cluster: true,
              },
            },
          },
        },
      });

    const response = await addHandler(mockCreateRequest, callWithRequest, mockResponseToolkit);
    const expectedResponse = {
      acknowledged: true,
    };
    expect(response).toEqual(expectedResponse);
  });

  it('throws an error if the response does not contain cluster information', async () => {
    const mockCreateRequest = ({
      payload: {
        name: 'test_cluster',
        seeds: [],
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {},
      });

    const expectedError = wrapCustomError(
      new Error('Unable to add cluster, no response returned from ES.'),
      400
    );

    await expect(
      addHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(expectedError);
  });

  it('throws an error if the cluster already exists', async () => {
    const mockCreateRequest = ({
      payload: {
        name: 'test_cluster',
        seeds: [],
      },
    } as unknown) as Request;

    const callWithRequest = jest.fn().mockReturnValueOnce({ test_cluster: true });

    const expectedError = wrapCustomError(
      new Error('There is already a remote cluster with that name.'),
      409
    );

    await expect(
      addHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(expectedError);
  });

  it('throws an ES error when one is received', async () => {
    const mockCreateRequest = ({
      payload: {
        name: 'test_cluster',
        seeds: [],
      },
    } as unknown) as Request;

    const mockError = new Error() as any;
    mockError.response = JSON.stringify({ error: 'Test error' });

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce(null)
      .mockRejectedValueOnce(mockError);

    await expect(
      addHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
    ).rejects.toThrow(Boom.boomify(mockError));
  });
});
