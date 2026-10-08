/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import type { LooseLensAttributes } from './lens_client';
import { LensClient } from './lens_client';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
import { getLensBuilder } from '../lazy_builder';

jest.mock('../lazy_builder');

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
  version: LENS_ITEM_LATEST_VERSION,
  description: 'bar',
};

describe('LensClient', () => {
  const httpMock = coreMock.createStart().http;
  let client: LensClient;

  beforeAll(() => {
    client = new LensClient(httpMock);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    httpMock.get.mockResolvedValue(mockResponse);
    httpMock.post.mockResolvedValue(mockResponse);
    httpMock.put.mockResolvedValue(mockResponse);
    httpMock.delete.mockResolvedValue({ response: { ok: true } });
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

  describe('with API format builder (useApiFormat=true)', () => {
    const TAG_ID = 'tag-id-abc123';
    const TAG_REFERENCE = { type: 'tag', id: TAG_ID, name: `tag-ref-${TAG_ID}` };
    const DATA_VIEW_REFERENCE = { type: 'index-pattern', id: 'dv-id', name: 'data-view' };

    // Minimal DSL config returned by builder.toAPIFormat — data_source absent so
    // isLensDSLConfig() returns true (it only returns false for ES|QL sources).
    const mockApiConfig = { type: 'metric', title: 'Test', tags: [TAG_ID] };

    // Attributes returned by builder.fromAPIFormat — tag refs are absent because
    // LensClient adds them separately via toStoredTags.
    const mockBuilderAttributes = {
      title: 'Test',
      visualizationType: 'lnsMetric',
      references: [DATA_VIEW_REFERENCE],
      state: { visualization: {} },
    };

    const mockBuilder = {
      isEnabled: true,
      isSupported: jest.fn().mockReturnValue(true),
      getType: jest.fn().mockReturnValue('lnsMetric'),
      toAPIFormat: jest.fn().mockReturnValue(mockApiConfig),
      fromAPIFormat: jest.fn().mockReturnValue(mockBuilderAttributes),
    };

    let builderClient: LensClient;

    beforeAll(() => {
      (getLensBuilder as jest.Mock).mockReturnValue(mockBuilder);
      builderClient = new LensClient(httpMock);
    });

    beforeEach(() => {
      // Restore implementations cleared by the outer beforeEach's clearAllMocks.
      mockBuilder.isSupported.mockReturnValue(true);
      mockBuilder.getType.mockReturnValue('lnsMetric');
      mockBuilder.toAPIFormat.mockReturnValue(mockApiConfig);
      mockBuilder.fromAPIFormat.mockReturnValue(mockBuilderAttributes);
    });

    describe('create', () => {
      it('should include tag IDs in the POST body when references contain tag refs', async () => {
        httpMock.post.mockResolvedValue({ id: 'new-id', data: mockApiConfig, meta: {} });

        await builderClient.create(mockAttributes, [TAG_REFERENCE, DATA_VIEW_REFERENCE]);

        const [, { body }] = httpMock.post.mock.calls[0] as unknown as [string, { body: string }];
        expect(JSON.parse(body).tags).toEqual([TAG_ID]);
      });

      it('should reconstruct tag references from the create response', async () => {
        httpMock.post.mockResolvedValue({ id: 'new-id', data: mockApiConfig, meta: {} });

        const result = await builderClient.create(mockAttributes, [TAG_REFERENCE]);

        expect(result.item.references).toContainEqual(TAG_REFERENCE);
      });
    });

    describe('get', () => {
      it('should reconstruct tag references from the get response', async () => {
        httpMock.get.mockResolvedValue({ id: 'some-id', data: mockApiConfig, meta: {} });

        const result = await builderClient.get('some-id');

        expect(result.item.references).toContainEqual(TAG_REFERENCE);
      });
    });

    describe('update', () => {
      it('should include tag IDs in the PUT body when references contain tag refs', async () => {
        httpMock.put.mockResolvedValue({ id: 'some-id', data: mockApiConfig, meta: {} });

        await builderClient.update('some-id', mockAttributes, [TAG_REFERENCE, DATA_VIEW_REFERENCE]);

        const [, { body }] = httpMock.put.mock.calls[0] as unknown as [string, { body: string }];
        expect(JSON.parse(body).tags).toEqual([TAG_ID]);
      });

      it('should reconstruct tag references from the update response', async () => {
        httpMock.put.mockResolvedValue({ id: 'some-id', data: mockApiConfig, meta: {} });

        const result = await builderClient.update('some-id', mockAttributes, [TAG_REFERENCE]);

        expect(result.item.references).toContainEqual(TAG_REFERENCE);
      });
    });

    describe('search', () => {
      it('should reconstruct tag references from search results', async () => {
        httpMock.get.mockResolvedValue({ data: [{ id: 'some-id', data: mockApiConfig }] });

        const items = await builderClient.search({ query: '' });

        expect(items[0].references).toContainEqual(TAG_REFERENCE);
      });
    });
  });
});
