/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StoreAlertEventsStep } from './store_alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import {
  collectStreamResults,
  createPipelineStream,
  createRulePipelineState,
  createAlertEvent,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createStorageService } from '../../services/storage_service/storage_service.mock';

describe('StoreAlertEventsStep', () => {
  let step: StoreAlertEventsStep;
  let mockEsClient: ReturnType<typeof createStorageService>['mockEsClient'];

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient: esClient } = createStorageService();
    mockEsClient = esClient;
    step = new StoreAlertEventsStep(loggerService, storageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('stores alert events and emits the persistence outcome on meta.persistence.alertEventsBatch', async () => {
      const alertEventsBatch = [
        createAlertEvent({ group_hash: 'hash-1', status: 'breached' }),
        createAlertEvent({ group_hash: 'hash-2', status: 'recovered' }),
      ];

      const mockBulkResponse = {
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
        took: 1,
      };

      // @ts-expect-error - not all BulkResponseItem fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      const state = createRulePipelineState({ alertEventsBatch });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({
        type: 'continue',
        state,
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: alertEventsBatch.length,
              docs: alertEventsBatch,
              errors: [],
            },
          },
        },
      });
      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      expect(bulkCall.refresh).toBe(false);
      expect(bulkCall.operations).toHaveLength(4);

      const operations = bulkCall.operations as Array<Record<string, unknown>>;

      expect(operations[0]).toEqual({
        create: { _index: ALERT_EVENTS_DATA_STREAM },
      });

      expect(operations[1]).toMatchObject({
        group_hash: 'hash-1',
        status: 'breached',
      });

      expect(operations[2]).toEqual({
        create: { _index: ALERT_EVENTS_DATA_STREAM },
      });

      expect(operations[3]).toMatchObject({
        group_hash: 'hash-2',
        status: 'recovered',
      });
    });

    it('handles empty alert events array without calling bulk and emits a zero bulk-index observation', async () => {
      const state = createRulePipelineState({ alertEventsBatch: [] });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({
        type: 'continue',
        state,
        meta: {
          observations: {
            bulkIndexResult: { attempted: 0, docs: [], errors: [] },
          },
        },
      });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('surfaces per-doc failures on meta.observations.bulkIndexResult.errors with the original document', async () => {
      const alertEventsBatch = [
        createAlertEvent({ group_hash: 'hash-1', status: 'breached' }),
        createAlertEvent({ group_hash: 'hash-2', status: 'breached' }),
      ];

      const mockBulkResponse = {
        items: [
          { create: { _id: '1', status: 201 } },
          {
            create: {
              _id: '2',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'boom', status: 400 },
            },
          },
        ],
        errors: true,
      };

      // @ts-expect-error - not all BulkResponseItem fields are used
      mockEsClient.bulk.mockResolvedValue(mockBulkResponse);

      const state = createRulePipelineState({ alertEventsBatch });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({
        type: 'continue',
        state,
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: 2,
              docs: [alertEventsBatch[0]],
              errors: [
                {
                  code: 'mapper_parsing_exception',
                  message: 'boom',
                  details: { statusCode: 400 },
                  index: ALERT_EVENTS_DATA_STREAM,
                  document: alertEventsBatch[1],
                },
              ],
            },
          },
        },
      });

      // @ts-expect-error: meta is present on the result
      expect(result.meta?.observations?.bulkIndexResult?.docs[0]).toBe(alertEventsBatch[0]);
      // @ts-expect-error: meta is present on the result
      expect(result.meta?.observations?.bulkIndexResult?.errors[0].document).toBe(
        alertEventsBatch[1]
      );
    });

    it('halts with state_not_ready when alertEventsBatch is missing from state', async () => {
      const state = createRulePipelineState();
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('propagates storage service errors', async () => {
      const alertEventsBatch = [createAlertEvent()];
      mockEsClient.bulk.mockRejectedValue(new Error('Bulk index failed'));

      const state = createRulePipelineState({ alertEventsBatch });

      await expect(
        collectStreamResults(step.executeStream(createPipelineStream([state])))
      ).rejects.toThrow('Bulk index failed');
    });
  });
});
