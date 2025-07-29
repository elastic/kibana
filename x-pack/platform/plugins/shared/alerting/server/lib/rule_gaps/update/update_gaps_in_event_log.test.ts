/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mgetGaps } from '../mget_gaps';
import { loggerMock } from '@kbn/logging-mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { Gap } from '../gap';
import { alertingEventLoggerMock } from '../../alerting_event_logger/alerting_event_logger.mock';

jest.mock('../mget_gaps');
jest.useFakeTimers();
jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
  cb();
  return 0 as unknown as NodeJS.Timeout;
});

// Require the module after useFakeTimers is called
// eslint-disable-next-line @typescript-eslint/no-var-requires
const updateGapsInEventLog = require('./update_gaps_in_event_log').updateGapsInEventLog;

describe('updateGapsInEventLog', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const alertingEventLogger = alertingEventLoggerMock.create();
  const eventLoggerUpdateGapsMock = alertingEventLogger.updateGaps as jest.Mock;

  const mgetGapsMock = mgetGaps as jest.Mock;
  const prepareGaps = async (gaps: Gap[]) =>
    gaps.map((gap) => ({
      gap: gap.toObject(),
      internalFields: gap.internalFields as NonNullable<Gap['internalFields']>,
    }));
  const prepareGapsMock = jest.fn(prepareGaps);

  const createTestGap = () =>
    new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });
  const testGap = createTestGap();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    beforeEach(() => {
      eventLoggerUpdateGapsMock.mockResolvedValue({
        errors: false,
        took: 1,
        items: [],
      });
    });
    it('should orchestrate the gap update process', async () => {
      const gaps = [testGap];
      const success = await updateGapsInEventLog({
        gaps,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        alertingEventLogger,
        prepareGaps: prepareGapsMock,
      });

      expect(prepareGapsMock).toHaveBeenCalledWith(gaps);
      expect(eventLoggerUpdateGapsMock).toHaveBeenNthCalledWith(1, await prepareGaps(gaps));
      expect(success).toBe(true);
    });

    it('should not update gaps when prepareGaps returns an empty list', async () => {
      const gaps = [testGap];
      prepareGapsMock.mockResolvedValueOnce([]);
      const success = await updateGapsInEventLog({
        gaps,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        alertingEventLogger,
        prepareGaps: prepareGapsMock,
      });

      expect(prepareGapsMock).toHaveBeenCalledWith(gaps);
      expect(eventLoggerUpdateGapsMock).not.toHaveBeenCalled();
      expect(success).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      if (!testGap.internalFields?._id) {
        throw new Error('Test gap should have internalFields._id');
      }
      mgetGapsMock.mockResolvedValue([testGap]);
      eventLoggerUpdateGapsMock.mockResolvedValue({
        errors: true,
        took: 1,
        items: [{ update: { status: 409, _id: testGap.internalFields._id, _index: 'test-index' } }],
      });
    });

    it('should retry 3 times before returning false', async () => {
      const gaps = [testGap];
      const success = await updateGapsInEventLog({
        gaps,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        alertingEventLogger,
        prepareGaps: prepareGapsMock,
      });

      let timesCalled = 1;
      while (timesCalled < 4) {
        expect(prepareGapsMock).toHaveBeenNthCalledWith(timesCalled, gaps);
        expect(eventLoggerUpdateGapsMock).toHaveBeenNthCalledWith(
          timesCalled,
          await prepareGaps(gaps)
        );
        expect(mgetGapsMock).toHaveBeenNthCalledWith(timesCalled, {
          eventLogClient: mockEventLogClient,
          logger: mockLogger,
          params: {
            docs: [
              {
                _id: testGap.internalFields?._id,
                _index: testGap.internalFields?._index,
              },
            ],
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          `Retrying update of 1 gaps due to conflicts. Retry ${timesCalled} of 3`
        );
        timesCalled++;
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update 1 gaps after 3 retries due to conflicts'
      );
      expect(success).toBe(false);
    });

    it('should return true when there are no gaps to retry after a failure', async () => {
      mgetGapsMock.mockResolvedValueOnce([]);
      const gaps = [testGap];
      const success = await updateGapsInEventLog({
        gaps,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        alertingEventLogger,
        prepareGaps: prepareGapsMock,
      });

      expect(prepareGapsMock).toHaveBeenCalledTimes(1);
      expect(eventLoggerUpdateGapsMock).toHaveBeenCalledTimes(1);
      expect(mgetGapsMock).toHaveBeenCalledTimes(1);
      expect(success).toBe(true);
    });

    it('should log an error and return false when an unexpected error occurs', async () => {
      prepareGapsMock.mockRejectedValueOnce(new Error('Boom!'));
      const success = await updateGapsInEventLog({
        gaps: [testGap],
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        alertingEventLogger,
        prepareGaps: prepareGapsMock,
      });

      expect(success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update gaps in event log: Boom!');
    });
  });
});
