/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit } from 'hapi';
import { wrapCustomError } from '../../../../../server/lib/create_router';
import { createDeleteHandler } from './delete_route';

describe('[API Routes] Remote Clusters deleteHandler()', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  const isEsError = () => true;
  const deleteHandler = createDeleteHandler(isEsError);

  it('returns names of deleted remote cluster', async () => {
    const mockCreateRequest = ({
      params: {
        nameOrNames: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {},
          },
        },
      });

    const response = await deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit);
    const expectedResponse = { errors: [], itemsDeleted: ['test_cluster'] };
    expect(response).toEqual(expectedResponse);
  });

  it('returns names of multiple deleted remote clusters', async () => {
    const mockCreateRequest = ({
      params: {
        nameOrNames: 'test_cluster1,test_cluster2',
      },
    } as unknown) as Request;

    const clusterExistsEsResponseMock = { test_cluster1: true, test_cluster2: true };

    const successfulDeletionEsResponseMock = {
      acknowledged: true,
      persistent: {
        cluster: {
          remote: {},
        },
      },
    };

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce(clusterExistsEsResponseMock)
      .mockReturnValueOnce(clusterExistsEsResponseMock)
      .mockReturnValueOnce(successfulDeletionEsResponseMock)
      .mockReturnValueOnce(successfulDeletionEsResponseMock);

    const response = await deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit);
    const expectedResponse = { errors: [], itemsDeleted: ['test_cluster1', 'test_cluster2'] };
    expect(response).toEqual(expectedResponse);
  });

  it('returns an error if the response contains cluster information', async () => {
    const mockCreateRequest = ({
      params: {
        nameOrNames: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockReturnValueOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test_cluster: {},
            },
          },
        },
      });

    const response = await deleteHandler(mockCreateRequest, callWithRequest);
    const expectedResponse = {
      errors: [
        {
          name: 'test_cluster',
          error: wrapCustomError(
            new Error('Unable to delete cluster, information still returned from ES.'),
            400
          ),
        },
      ],
      itemsDeleted: [],
    };
    expect(response).toEqual(expectedResponse);
  });

  it(`returns an error if the cluster doesn't exist`, async () => {
    const mockCreateRequest = ({
      params: {
        nameOrNames: 'test_cluster',
      },
    } as unknown) as Request;

    const callWithRequest = jest.fn().mockReturnValueOnce({});

    const response = await deleteHandler(mockCreateRequest, callWithRequest);
    const expectedResponse = {
      errors: [
        {
          name: 'test_cluster',
          error: wrapCustomError(new Error('There is no remote cluster with that name.'), 404),
        },
      ],
      itemsDeleted: [],
    };
    expect(response).toEqual(expectedResponse);
  });

  it('forwards an ES error when one is received', async () => {
    const mockCreateRequest = ({
      params: {
        nameOrNames: 'test_cluster',
      },
    } as unknown) as Request;

    const mockError = new Error() as any;
    mockError.response = JSON.stringify({ error: 'Test error' });

    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({ test_cluster: true })
      .mockRejectedValueOnce(mockError);

    const response = await deleteHandler(mockCreateRequest, callWithRequest);
    const expectedResponse = {
      errors: [
        {
          name: 'test_cluster',
          error: Boom.boomify(mockError),
        },
      ],
      itemsDeleted: [],
    };
    expect(response).toEqual(expectedResponse);
  });
});
