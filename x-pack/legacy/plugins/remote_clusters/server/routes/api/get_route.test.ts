/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler } from './get_route';

describe('[API Routes] Remote Clusters getAllHandler()', () => {
  const mockResponseToolkit = {} as ResponseToolkit;

  it('converts the ES response object to an array', async () => {
    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({})
      .mockReturnValueOnce({
        abc: { seeds: ['xyz'] },
        foo: { seeds: ['bar'] },
      });

    const response = await getAllHandler({} as Request, callWithRequest, mockResponseToolkit);
    const expectedResponse: any[] = [
      { name: 'abc', seeds: ['xyz'], isConfiguredByNode: true },
      { name: 'foo', seeds: ['bar'], isConfiguredByNode: true },
    ];
    expect(response).toEqual(expectedResponse);
  });

  it('returns an empty array when ES responds with an empty object', async () => {
    const callWithRequest = jest
      .fn()
      .mockReturnValueOnce({})
      .mockReturnValueOnce({});

    const response = await getAllHandler({} as Request, callWithRequest, mockResponseToolkit);
    const expectedResponse: any[] = [];
    expect(response).toEqual(expectedResponse);
  });
});
