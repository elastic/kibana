/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import type { LooseLensAttributes } from './lens_client';
import { LensClient } from './lens_client';

const mockResponse = {
  data: {},
  meta: {},
};

const mockAttributes: LooseLensAttributes = {
  title: 'Test Visualization',
  visualizationType: 'lensXY',
  state: {
    visualization: {},
  },
  version: 1,
  description: 'bar',
};

describe('LensClient', () => {
  const httpMock = coreMock.createStart().http;
  const client = new LensClient(httpMock);

  beforeAll(() => {
    httpMock.get.mockResolvedValue(mockResponse);
    httpMock.post.mockResolvedValue(mockResponse);
    httpMock.put.mockResolvedValue(mockResponse);
    httpMock.delete.mockResolvedValue({ response: { ok: true } });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.todo('get');
  it.todo('update');
  it.todo('delete');

  describe('create', () => {
    it('should throw an error if visualizationType is null', async () => {
      await expect(
        client.create(
          {
            ...mockAttributes,
            visualizationType: null,
          },
          []
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Missing visualization type"`);
    });
  });
});
