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

const range = (rangeStart: string, rangeEnd: string) => ({
  gte: new Date(rangeStart),
  lte: new Date(rangeEnd),
});
const createGap = (unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
  return {
    unfilledIntervals,
  } as unknown as Gap;
};

const generateTestCaseData = (iterations: number) => {
  const pageSize = 500;
  const oneMinuteMs = 60 * 1000;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - iterations * pageSize * oneMinuteMs);

  let nextDate = startDate;
  const getDateRange = () => {
    const date = nextDate.toISOString();
    nextDate = new Date(nextDate.getTime() + oneMinuteMs);
    return range(date, nextDate.toISOString());
  };
  const findGapsSearchReturnValues = Array.from({ length: iterations }).map((_, idx) => {
    return {
      data: Array.from({ length: 500 }).map((__) => createGap([getDateRange()])),
      searchAfter: idx + 1 === iterations ? null : `some-search-after-${idx}`,
      pitId: `pitd-${idx}`,
    };
  });

  return {
    findGapsSearchReturnValues,
    searchRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
};

describe('processAllGapsInTimeRange', () => {
  const ruleId = 'some-rule-id';
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  let processGapsBatchMock: jest.Mock;

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    let processGapsBatchCall = 1;
    processGapsBatchMock = jest.fn(async () => processGapsBatchCall++);
  });

  describe('happy path', () => {
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(3);
    const { start, end } = searchRange;
    let results: Awaited<ReturnType<typeof processAllGapsInTimeRange>>;
    beforeEach(async () => {
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      results = await processAllGapsInTimeRange({
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

    it('should return a list with the results of each call to processGapsBatch', () => {
      // In this test we make processGapsBatch to return a number representing how many times it was called
      expect(results).toEqual(findGapsSearchReturnValues.map((_, idx) => idx + 1));
    });
  });

  describe('when there are no gaps to process', () => {
    let results: Awaited<ReturnType<typeof processAllGapsInTimeRange>>;
    beforeEach(async () => {
      findGapsSearchAfterMock.mockResolvedValue({
        data: [],
        searchAfer: null,
        pitId: null,
      });
      results = await processAllGapsInTimeRange({
        ruleId,
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    it('should not call processGapsBatch', () => {
      expect(processGapsBatchMock).not.toHaveBeenCalled();
    });

    it('should return an empty results array', () => {
      expect(results).toEqual([]);
    });
  });

  describe('when the max iterations are reached', () => {
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(10001);
    const { start, end } = searchRange;
    let results: Awaited<ReturnType<typeof processAllGapsInTimeRange>>;
    beforeEach(async () => {
      findGapsSearchAfterMock.mockImplementation(() => {
        return {
          data: [],
          searchAfter: null,
          pitId: null,
        };
      });
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      results = await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    it('should stop fetching gaps when the max number of iterations is reached', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(10000);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });

    it('should return a list with the results of each call to processGapsBatch', () => {
      // In this test we make processGapsBatch to return a number representing how many times it was called
      expect(results).toEqual(findGapsSearchReturnValues.slice(0, 10000).map((_, idx) => idx + 1));
    });
  });

  describe('when the max amount of gaps specified in the params is reached', () => {
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(3);
    const { start, end } = searchRange;
    let processedGapsCount = 0;
    beforeEach(async () => {
      processGapsBatchMock.mockImplementation(async (gaps) => {
        processedGapsCount += gaps.length;
      });
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllGapsInTimeRange({
        ruleId,
        start,
        end,
        logger: mockLogger,
        options: {
          maxFetchedGaps: 550,
        },
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    afterEach(() => {
      processedGapsCount = 0;
    });

    it('should stop fetching gaps when the max number of gaps is reached', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(2);
    });

    it('should only process the amount of gaps specified', () => {
      expect(processedGapsCount).toEqual(550);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when nextSearchAfter is null', () => {
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(2);
    // Make it stop after the first result
    findGapsSearchReturnValues[0].searchAfter = null;
    const { start, end } = searchRange;
    let processedGapsCount = 0;
    beforeEach(async () => {
      processGapsBatchMock.mockImplementation(async (gaps) => {
        processedGapsCount += gaps.length;
      });
      findGapsSearchAfterMock.mockImplementation(() => {
        return {
          data: [],
          searchAfter: null,
          pitId: null,
        };
      });
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

    it('should stop fetching gaps', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(1);
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when there is an error', () => {
    const thrownError = new Error('boom!');
    let caughtError: Error;
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(2);
    const { start, end } = searchRange;
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
