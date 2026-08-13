/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsSearchResponse } from '@kbn/core-saved-objects-api-server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getUserCommentsTelemetryData } from './comments';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('comments', () => {
  describe('getUserCommentsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const legacyResponse = {
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 1, key: 1 },
            { doc_count: 2, key: 2 },
            { doc_count: 3, key: 3 },
          ],
        },
      },
    };

    const unifiedResponse = {
      total: 10,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 10, key: 1 },
            { doc_count: 20, key: 2 },
            { doc_count: 30, key: 3 },
          ],
        },
      },
    };

    const buildMaxCommentsResponse = (value: number | null) =>
      ({
        took: 0,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        aggregations: { maxCounter: { value } },
      } as unknown as SavedObjectsSearchResponse);

    beforeEach(() => {
      jest.clearAllMocks();
      savedObjectsClient.find
        .mockResolvedValueOnce(legacyResponse)
        .mockResolvedValueOnce(unifiedResponse);
      savedObjectsClient.search.mockResolvedValue(buildMaxCommentsResponse(8));
    });

    it('merges legacy cases-comments and unified cases-attachments counts', async () => {
      const res = await getUserCommentsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      // Counts are summed across both saved objects; maxOnACase comes from the case
      // `total_comments` counter (covers both sources).
      expect(res).toEqual({
        all: {
          total: 15,
          daily: 33,
          weekly: 22,
          monthly: 11,
          maxOnACase: 8,
        },
      });
    });

    it('sources maxOnACase from the case total_comments counter', async () => {
      await getUserCommentsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(savedObjectsClient.search).toHaveBeenCalledWith({
        type: ['cases'],
        namespaces: ['*'],
        size: 0,
        aggs: {
          maxCounter: { max: { field: 'cases.total_comments' } },
        },
      });
    });

    it('clamps the -1 total_comments sentinel to 0', async () => {
      savedObjectsClient.search.mockResolvedValueOnce(buildMaxCommentsResponse(-1));

      const res = await getUserCommentsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(res.all.maxOnACase).toBe(0);
    });

    it('queries legacy cases-comments (type: user)', async () => {
      await getUserCommentsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(1, {
        aggs: {
          counts: {
            date_range: {
              field: 'cases-comments.attributes.created_at',
              format: 'dd/MM/yyyy',
              ranges: [
                { from: 'now-1d', to: 'now' },
                { from: 'now-1w', to: 'now' },
                { from: 'now-1M', to: 'now' },
              ],
            },
          },
        },
        filter: {
          arguments: [
            { type: 'literal', value: 'cases-comments.attributes.type', isQuoted: false },
            { type: 'literal', value: 'user', isQuoted: false },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-comments',
        namespaces: ['*'],
      });
    });

    it('queries unified cases-attachments (type: comment)', async () => {
      await getUserCommentsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });
      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(2, {
        aggs: {
          counts: {
            date_range: {
              field: 'cases-attachments.attributes.created_at',
              format: 'dd/MM/yyyy',
              ranges: [
                { from: 'now-1d', to: 'now' },
                { from: 'now-1w', to: 'now' },
                { from: 'now-1M', to: 'now' },
              ],
            },
          },
        },
        filter: {
          arguments: [
            { type: 'literal', value: 'cases-attachments.attributes.type', isQuoted: false },
            { type: 'literal', value: 'comment', isQuoted: false },
          ],
          function: 'is',
          type: 'function',
        },
        page: 0,
        perPage: 0,
        type: 'cases-attachments',
        namespaces: ['*'],
      });
    });
  });
});
