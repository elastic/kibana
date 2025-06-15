/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { findGapsSearchAfter } from './find_gaps';
import { processAllGapsInTimeRange } from './process_all_gaps_in_time_range';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type { Gap } from './gap';
import { gapStatus } from '../../../common/constants';

jest.mock('./find_gaps', () => {
  return {
    findGapsSearchAfter: jest.fn(),
  };
});

const findGapsSearchAfterMock = findGapsSearchAfter as jest.Mock;

describe('processAllGapsInTimeRange', () => {
  const ruleId = 'some-rule-id';
  const start = '2025-05-11T17:18:03.608Z';
  const end = '2025-05-21T17:18:03.608Z';
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const processGapsBatchMock = jest.fn(async (gaps: Gap[]) => {});

  const range = (rangeStart: string, rangeEnd: string) => ({
    gte: new Date(rangeStart),
    lte: new Date(rangeEnd),
  });
  const createGap = (unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
    return {
      unfilledIntervals,
    } as unknown as Gap;
  };

  const findGapsSearchReturnValues = [
    {
      data: [
        createGap([
          range('2025-05-09T09:15:09.457Z', '2025-05-09T09:20:09.457Z'),
          range('2025-05-09T09:21:09.457Z', '2025-05-09T09:22:09.457Z'),
        ]),
      ],
      searchAfter: 'some-search-after-1',
      pitId: 'pitd-1',
    },
    {
      data: [
        createGap([
          range('2025-05-09T09:15:09.457Z', '2025-05-09T09:20:09.457Z'),
          range('2025-05-09T09:21:09.457Z', '2025-05-09T09:22:09.457Z'),
        ]),
        createGap([range('2025-05-09T09:23:09.457Z', '2025-05-09T09:24:09.457Z')]),
      ],
      searchAfter: 'some-search-after-2',
      pitId: 'pitd-2',
    },
    {
      data: [createGap([range('2025-05-09T09:23:09.457Z', '2025-05-09T09:24:09.457Z')])],
      searchAfter: null,
      pitId: 'pitd-3',
    },
  ];

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('happy path', () => {
    beforeEach(async () => {
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    it('should fetch all the gaps for the rule', () => {
      const callParams = [
        { pitId: undefined, searchAfter: undefined },
        {
          pitId: findGapsSearchReturnValues[0].pitId,
          searchAfter: findGapsSearchReturnValues[0].searchAfter,
        },
        {
          pitId: findGapsSearchReturnValues[1].pitId,
          searchAfter: findGapsSearchReturnValues[1].searchAfter,
        },
      ];

      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(callParams.length);
      callParams.forEach(({ pitId, searchAfter }, idx) => {
        const callOrder = idx + 1;
        expect(findGapsSearchAfterMock).toHaveBeenNthCalledWith(callOrder, {
          eventLogClient: mockEventLogClient,
          logger: mockLogger,
          params: {
            ruleId,
            start,
            end,
            perPage: 500,
            statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
            sortField: '@timestamp',
            sortOrder: 'asc',
            searchAfter,
            pitId,
          },
        });
      });
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });

    it('should call the processing gaps function passed as parameter', () => {
      expect(processGapsBatchMock).toHaveBeenCalledTimes(findGapsSearchReturnValues.length);
      findGapsSearchReturnValues.forEach(({ data }, idx) => {
        const callOrder = idx + 1;
        expect(processGapsBatchMock).toHaveBeenNthCalledWith(callOrder, data);
      });
    });
  });

  describe('when the max iterations are reached', () => {
    const maxIterations = 2;
    beforeEach(async () => {
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
        options: {
          maxIterations,
        },
      });
    });

    it('should stop fetching gaps when the max number of iterations is reached', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(maxIterations);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the max amount of gaps specified in the params is reached', () => {
    let processedGapsCounts: number[];
    beforeEach(async () => {
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );

      processedGapsCounts = [];

      processGapsBatchMock.mockImplementation(async (gaps) => {
        processedGapsCounts.push(gaps.length);
      });

      await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
        options: {
          maxFetchedGaps: 2,
        },
      });
    });

    it('should stop fetching gaps when the max number of gaps is reached', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(2);
    });

    it('should only process the amount of gaps specified', () => {
      // One gap processed in the first run, another in the second, for a total of 2
      expect(processedGapsCounts).toEqual([1, 1]);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when nextSearchAfter is null', () => {
    beforeEach(async () => {
      const newReturnValues = [
        ...findGapsSearchReturnValues,
        // Add one more, however, since the last element of findGapsSearchReturnValues
        // has a searchAfter equals to null, the execution should stop there
        {
          data: [createGap([range('2025-05-09T09:23:09.457Z', '2025-05-09T09:24:09.457Z')])],
          searchAfter: null,
          pitId: 'pitd-4',
        },
      ];

      newReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    it('should stop stop fetching gaps', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(findGapsSearchReturnValues.length);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when there is an error', () => {
    const thrownError = new Error('boom!');
    let caughtError: Error;
    beforeEach(async () => {
      findGapsSearchAfterMock.mockResolvedValueOnce(findGapsSearchReturnValues[0]);
      findGapsSearchAfterMock.mockRejectedValue(thrownError);
      try {
        await processAllGapsInTimeRange({
          ruleId,
          start,
          end,
          logger: mockLogger,
          eventLogClient: mockEventLogClient,
          processGapsBatch: processGapsBatchMock,
        });
      } catch (error) {
        caughtError = error;
      }
    });

    it('should propagate the error', () => {
      expect(caughtError).toBe(thrownError);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });
});
