/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateGapsInEventLog } from '../update/update_gaps_in_event_log';
import { loggerMock } from '@kbn/logging-mocks';
import { softDeleteGapsBatch } from './soft_delete_gaps_batch';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { Gap } from '../gap';
import { alertingEventLoggerMock } from '../../alerting_event_logger/alerting_event_logger.mock';

jest.mock('../update/update_gaps_in_event_log', () => ({
  updateGapsInEventLog: jest.fn().mockResolvedValue(true),
}));

const updateGapsInEventLogMock = updateGapsInEventLog as jest.Mock;

const mockLogger = loggerMock.create();
const eventLogClient = eventLogClientMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();
const getGap = (id: string) =>
  new Gap({
    range: {
      gte: '2024-01-01T00:00:00.000Z',
      lte: '2024-01-01T01:00:00.000Z',
    },
    internalFields: {
      _id: `test-${id}`,
      _index: 'test-index',
      _seq_no: 1,
      _primary_term: 1,
    },
  });
const gaps = [getGap('1'), getGap('2')];

describe('softDeleteGapsBatch', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await softDeleteGapsBatch({
      gaps,
      eventLogClient,
      alertingEventLogger,
      logger: mockLogger,
    });
  });

  it('should call updateGapsInEventLog with the right parameters', () => {
    expect(updateGapsInEventLogMock).toHaveBeenCalledWith({
      gaps,
      prepareGaps: expect.any(Function),
      eventLogClient,
      alertingEventLogger,
      logger: mockLogger,
    });
  });

  describe('prepareGaps fn', () => {
    let prepareGapsFn: Function;
    let result: Array<{
      gap: ReturnType<typeof Gap.prototype.toObject>;
      internalFields: typeof Gap.prototype.internalFields;
    }>;

    beforeEach(async () => {
      prepareGapsFn = updateGapsInEventLogMock.mock.calls[0][0].prepareGaps;
      result = await prepareGapsFn(gaps);
    });

    it('should return gaps ready to be written to the event log', () => {
      expect(result).toEqual(
        gaps.map((gap) => ({
          gap: { ...gap.toObject(), deleted: true },
          internalFields: gap.internalFields,
        }))
      );
    });
  });
});
