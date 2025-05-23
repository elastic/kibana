/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import { getBackfillPayloadForRuleGaps } from './get_backfill_payload_for_rule_gaps';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';

jest.mock('../../../../lib/rule_gaps/process_all_gaps_in_time_range', () => {
  return {
    processAllGapsInTimeRange: jest.fn(),
  };
});

const processAllGapsInTimeRangeMock = processAllGapsInTimeRange as jest.Mock;

describe('getBackfillPayloadForRuleGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const ruleId = 'some-rule-id';
  const backfillingDateRange = {
    start: '2025-05-09T09:15:09.457Z',
    end: '2025-05-20T09:24:09.457Z',
  };
  const range = (start: string, end: string) => ({ gte: new Date(start), lte: new Date(end) });
  const createGap = (unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
    return {
      unfilledIntervals,
    } as unknown as Gap;
  };

  const gapsBatches = [
    [
      createGap([range('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z')]),
      createGap([range('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z')]),
    ],
    [createGap([range('2025-05-13T09:15:09.457Z', '2025-05-14T09:15:09.457Z')])],
  ];

  let result: Awaited<ReturnType<typeof getBackfillPayloadForRuleGaps>>;

  beforeEach(async () => {
    processAllGapsInTimeRangeMock.mockImplementation(({ processGapsBatch }) => {
      gapsBatches.forEach((batch) => processGapsBatch(batch));
    });

    result = await getBackfillPayloadForRuleGaps(mockEventLogClient, mockLogger, {
      ruleId,
      range: backfillingDateRange,
    });
  });

  it('should trigger the processing of all gaps in the time range correctly', () => {
    expect(processAllGapsInTimeRangeMock).toHaveBeenCalledTimes(1);
    expect(processAllGapsInTimeRangeMock).toHaveBeenCalledWith({
      eventLogClient: mockEventLogClient,
      logger: mockLogger,
      options: {
        maxFetchedGaps: 1000,
      },
      processGapsBatch: expect.any(Function),
      ruleId,
      ...backfillingDateRange,
    });
  });

  it('should return the backfill payload for all fetched gaps', () => {
    expect(result.backfillRequestPayload).toEqual({
      ruleId,
      ranges: gapsBatches
        .flatMap((batch) => batch.flatMap((gap) => gap.unfilledIntervals))
        .map(({ gte, lte }) => ({ start: gte.toISOString(), end: lte.toISOString() })),
    });
  });

  it('should return the gaps that were fetched to build the payloads', () => {
    expect(result.gaps).toEqual(gapsBatches.flatMap((batch) => batch));
  });
});
