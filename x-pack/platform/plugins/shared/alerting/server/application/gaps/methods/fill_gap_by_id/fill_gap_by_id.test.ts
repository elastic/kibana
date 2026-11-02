/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { RulesClient } from '../../../../rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { findGapsById } from '../../../../lib/rule_gaps/find_gaps_by_id';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { getRule } from '../../../rule/methods/get/get_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

jest.mock('../../../../lib/rule_gaps/find_gaps_by_id');
jest.mock('../../../backfill/methods/schedule');
jest.mock('../../../rule/methods/get/get_rule');

describe('fillGapById', () => {
  let rulesClient: RulesClient;
  let eventLogClient: ReturnType<typeof eventLogClientMock.create>;
  const { rulesClientParams, authorization, auditLogger } = getRulesClientMockParams({
    kibanaVersion: 'v8.0.0',
    eventLogger: eventLoggerMock.create(),
  });
  const mockedGetRule = getRule as jest.MockedFunction<typeof getRule>;

  const mockRule = {
    id: '1',
    name: 'Test Rule',
    alertTypeId: 'test-type',
    consumer: 'test-consumer',
    enabled: true,
    tags: [],
    actions: [],
    schedule: { interval: '1m' },
    createdAt: new Date(),
    updatedAt: new Date(),
    params: {},
    executionStatus: {
      status: 'ok' as const,
      lastExecutionDate: new Date(),
    },
    notifyWhen: 'onActiveAlert' as const,
    muteAll: false,
    mutedInstanceIds: [],
    updatedBy: null,
    createdBy: null,
    apiKeyOwner: null,
    throttle: null,
    legacyId: null,
    revision: 1,
  };

  const getMockGap = (overwrites = {}) => ({
    getState: jest.fn().mockReturnValue({
      unfilledIntervals: [{ gte: '2023-11-16T08:00:00.000Z', lte: '2023-11-16T08:20:00.000Z' }],
      ...overwrites,
    }),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    eventLogClient = eventLogClientMock.create();
    mockedGetRule.mockResolvedValue(mockRule);

    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);

    rulesClient = new RulesClient(rulesClientParams);
  });

  describe('authorization', () => {
    it('should authorize and fill gap successfully', async () => {
      const params = { ruleId: '1', gapId: 'gap1' };
      const gap = getMockGap();

      (findGapsById as jest.Mock).mockResolvedValue([gap]);
      (scheduleBackfill as jest.Mock).mockResolvedValue('success');

      await rulesClient.fillGapById(params);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        ruleTypeId: mockRule.alertTypeId,
        consumer: mockRule.consumer,
        operation: WriteOperations.FillGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_fill_gaps',
            outcome: 'success',
          }),
          kibana: {
            saved_object: {
              id: mockRule.id,
              type: RULE_SAVED_OBJECT_TYPE,
              name: mockRule.name,
            },
          },
        })
      );
    });

    it('should throw error and log audit event when not authorized', async () => {
      const params = { ruleId: '1', gapId: 'gap1' };
      const authError = new Error('Unauthorized');
      authorization.ensureAuthorized.mockRejectedValue(authError);
      (findGapsById as jest.Mock).mockResolvedValue([getMockGap()]);

      await expect(rulesClient.fillGapById(params)).rejects.toThrow('Unauthorized');

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_fill_gaps',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: mockRule.id,
              type: RULE_SAVED_OBJECT_TYPE,
              name: mockRule.name,
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  it('successfully finds gap and schedules backfill', async () => {
    const params = { ruleId: '1', gapId: 'gap1' };
    const gap = getMockGap();
    const expectedBackfill = [
      {
        ruleId: '1',
        initiator: 'user',
        ranges: [
          {
            start: '2023-11-16T08:00:00.000Z',
            end: '2023-11-16T08:20:00.000Z',
          },
        ],
      },
    ];

    (findGapsById as jest.Mock).mockResolvedValue([gap]);
    (scheduleBackfill as jest.Mock).mockResolvedValue('success');

    const result = await rulesClient.fillGapById(params);

    expect(findGapsById).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          gapIds: [params.gapId],
          page: 1,
          perPage: 1,
          ruleId: params.ruleId,
        },
        eventLogClient: expect.any(Object),
        logger: expect.any(Object),
      })
    );
    expect(scheduleBackfill).toHaveBeenCalledWith(expect.any(Object), expectedBackfill);
    expect(result).toBe('success');
  });

  it('successfully handles multiple intervals', async () => {
    const params = { ruleId: '1', gapId: 'gap1' };
    const gap = getMockGap({
      unfilledIntervals: [
        { gte: '2023-11-16T08:00:00.000Z', lte: '2023-11-16T08:20:00.000Z' },
        { gte: '2023-11-16T09:00:00.000Z', lte: '2023-11-16T09:20:00.000Z' },
      ],
    });

    const expectedBackfill = [
      {
        ruleId: '1',
        initiator: 'user',
        ranges: [
          {
            start: '2023-11-16T08:00:00.000Z',
            end: '2023-11-16T08:20:00.000Z',
          },
          {
            start: '2023-11-16T09:00:00.000Z',
            end: '2023-11-16T09:20:00.000Z',
          },
        ],
      },
    ];

    (findGapsById as jest.Mock).mockResolvedValue([gap]);
    (scheduleBackfill as jest.Mock).mockResolvedValue('success');

    const result = await rulesClient.fillGapById(params);

    expect(scheduleBackfill).toHaveBeenCalledWith(expect.any(Object), expectedBackfill);
    expect(result).toBe('success');
  });

  it('throws error when gap is not found', async () => {
    (findGapsById as jest.Mock).mockResolvedValue([]);

    await expect(
      rulesClient.fillGapById({
        ruleId: '1',
        gapId: 'gap1',
      })
    ).rejects.toThrow('Gap not found for ruleId 1 and gapId gap1');
  });

  it('handles errors from finding gap', async () => {
    const error = new Error('Failed to find gap');
    (findGapsById as jest.Mock).mockRejectedValue(error);

    await expect(
      rulesClient.fillGapById({
        ruleId: '1',
        gapId: 'gap1',
      })
    ).rejects.toThrow('Failed to find gap and schedule manual rule run');
  });

  it('handles errors from scheduling backfill', async () => {
    const gap = getMockGap();
    (findGapsById as jest.Mock).mockResolvedValue([gap]);
    (scheduleBackfill as jest.Mock).mockRejectedValue(new Error('Scheduling failed'));

    await expect(
      rulesClient.fillGapById({
        ruleId: '1',
        gapId: 'gap1',
      })
    ).rejects.toThrow('Scheduling failed');
  });

  it('throws error when gap has no unfilled intervals', async () => {
    const params = { ruleId: '1', gapId: 'gap1' };
    const gap = getMockGap({
      unfilledIntervals: [],
    });

    (findGapsById as jest.Mock).mockResolvedValue([gap]);

    await expect(rulesClient.fillGapById(params)).rejects.toThrow(
      'No unfilled intervals found for ruleId 1'
    );

    expect(findGapsById).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          gapIds: [params.gapId],
          page: 1,
          perPage: 1,
          ruleId: params.ruleId,
        },
        eventLogClient: expect.any(Object),
        logger: expect.any(Object),
      })
    );
    expect(scheduleBackfill).not.toHaveBeenCalled();
  });

  it('should refresh event log after fill gap', async () => {
    const params = { ruleId: '1', gapId: 'gap1' };
    const gap = getMockGap();

    (findGapsById as jest.Mock).mockResolvedValue([gap]);
    (scheduleBackfill as jest.Mock).mockResolvedValue('success');

    await rulesClient.fillGapById(params);

    expect(eventLogClient.refreshIndex).toHaveBeenCalled();
  });
});
