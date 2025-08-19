/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { findGapsSearchAfter } from './find_gaps';
import { processAllRuleGaps } from './process_all_rule_gaps';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type { Gap } from './gap';
import { gapStatus } from '../../../common/constants';
import { chunk, concat, groupBy } from 'lodash';
import pMap from 'p-map';

jest.mock('./find_gaps', () => {
  return {
    findGapsSearchAfter: jest.fn(),
  };
});

jest.mock('p-map', () => jest.fn());

const findGapsSearchAfterMock = findGapsSearchAfter as jest.Mock;
const pMapMock = pMap as jest.Mock;

const range = (rangeStart: string, rangeEnd: string) => ({
  gte: new Date(rangeStart),
  lte: new Date(rangeEnd),
});
const createGap = (ruleId: string, unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
  return {
    ruleId,
    unfilledIntervals,
  } as unknown as Gap;
};

const getProcessGapsBatchImplementation =
  (processedGapsCount: Record<string, number>) =>
  async (gaps: Gap[], limits: Record<string, number>) => {
    const groupedGaps = groupBy(gaps, 'ruleId');
    const processedGapsCountCurrentIteration: Record<string, number> = {};

    Object.keys(groupedGaps).forEach((ruleId) => {
      processedGapsCountCurrentIteration[ruleId] = limits[ruleId]
        ? Math.min(limits[ruleId], groupedGaps[ruleId].length)
        : groupedGaps[ruleId].length;

      processedGapsCount[ruleId] += processedGapsCountCurrentIteration[ruleId];
    });

    return processedGapsCountCurrentIteration;
  };

const generateTestCaseData = (iterations: number, ruleIds: string[]) => {
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
      data: concat(
        ...ruleIds.map((ruleId) =>
          Array.from({ length: 500 }).map((__) => createGap(ruleId, [getDateRange()]))
        )
      ),
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

const generateRuleIds = (count: number) =>
  Array.from({ length: count }).map((_, idx) => `some-rule-id-${idx}`);

describe('processAllRuleGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();

  let processGapsBatchMock: jest.Mock;

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    let processGapsBatchCall = 1;
    processGapsBatchMock = jest.fn(async () => processGapsBatchCall++);
    const pMapActual = jest.requireActual('p-map');
    pMapMock.mockImplementation(pMapActual);
  });

  describe('concurrency logic', () => {
    const ruleIds = generateRuleIds(11);
    beforeEach(async () => {
      pMapMock.mockImplementation(() => Promise.resolve());
      await processAllRuleGaps({
        ruleIds,
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });
    it('should process rules in batches and concurrently', () => {
      expect(pMapMock).toHaveBeenCalledTimes(1);
      expect(pMapMock).toHaveBeenCalledWith(chunk(ruleIds, 10), expect.any(Function), {
        concurrency: 10,
      });
    });
  });

  describe('happy path', () => {
    const ruleIds = generateRuleIds(3);
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(3, ruleIds);
    const { start, end } = searchRange;
    beforeEach(async () => {
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllRuleGaps({
        ruleIds,
        start,
        end,
        logger: mockLogger,
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    it('should fetch all the gaps for the rules', () => {
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
            ruleIds,
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
        expect(processGapsBatchMock).toHaveBeenNthCalledWith(callOrder, data, {});
      });
    });
  });

  describe('when there are no gaps to process', () => {
    const ruleIds = generateRuleIds(3);
    beforeEach(async () => {
      findGapsSearchAfterMock.mockResolvedValue({
        data: [],
        searchAfer: null,
        pitId: null,
      });
      await processAllRuleGaps({
        ruleIds,
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
  });

  describe('when the max iterations are reached', () => {
    const ruleIds = generateRuleIds(1);
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(10001, ruleIds);
    const { start, end } = searchRange;
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
      await processAllRuleGaps({
        ruleIds,
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
  });

  describe('when the max amount of gaps specified in the params is reached', () => {
    const ruleIds = generateRuleIds(3);
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(3, ruleIds);
    const { start, end } = searchRange;
    const processedGapsCount = ruleIds.reduce((acc, ruleId) => {
      acc[ruleId] = 0;
      return acc;
    }, {} as Record<string, number>);
    beforeEach(async () => {
      processGapsBatchMock.mockImplementation(
        getProcessGapsBatchImplementation(processedGapsCount)
      );
      findGapsSearchReturnValues.forEach((returnValue) =>
        findGapsSearchAfterMock.mockResolvedValueOnce(returnValue)
      );
      await processAllRuleGaps({
        ruleIds,
        start,
        end,
        logger: mockLogger,
        options: {
          maxProcessedGapsPerRule: 550,
        },
        eventLogClient: mockEventLogClient,
        processGapsBatch: processGapsBatchMock,
      });
    });

    afterEach(() => {
      Object.keys(processedGapsCount).forEach((ruleId) => {
        processedGapsCount[ruleId] = 0;
      });
    });

    it('should stop fetching gaps when the max number of gaps is reached', () => {
      expect(findGapsSearchAfterMock).toHaveBeenCalledTimes(2);
    });

    it('should only process the amount of gaps specified', () => {
      Object.keys(processedGapsCount).forEach((ruleId) => {
        expect(processedGapsCount[ruleId]).toEqual(550);
      });
    });

    it('should call closePointInTime when it is done', () => {
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('when nextSearchAfter is null', () => {
    const ruleIds = generateRuleIds(3);
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(2, ruleIds);
    // Make it stop after the first result
    findGapsSearchReturnValues[0].searchAfter = null;
    const { start, end } = searchRange;
    const processedGapsCount = ruleIds.reduce((acc, ruleId) => {
      acc[ruleId] = 0;
      return acc;
    }, {} as Record<string, number>);
    beforeEach(async () => {
      processGapsBatchMock.mockImplementation(
        getProcessGapsBatchImplementation(processedGapsCount)
      );
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
      await processAllRuleGaps({
        ruleIds,
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
    const ruleIds = generateRuleIds(3);
    const thrownError = new Error('boom!');
    let caughtError: Error;
    const { findGapsSearchReturnValues, searchRange } = generateTestCaseData(2, ruleIds);
    const { start, end } = searchRange;
    beforeEach(async () => {
      findGapsSearchAfterMock.mockResolvedValueOnce(findGapsSearchReturnValues[0]);
      findGapsSearchAfterMock.mockRejectedValue(thrownError);
      try {
        await processAllRuleGaps({
          ruleIds,
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
