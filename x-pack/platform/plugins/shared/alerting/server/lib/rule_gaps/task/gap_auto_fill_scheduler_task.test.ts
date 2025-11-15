/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import {
  GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
  DEFAULT_RULES_BATCH_SIZE,
  DEFAULT_GAPS_PER_PAGE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
} from '../types/scheduler';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { backfillInitiator } from '../../../../common/constants';
import { gapStatus } from '../../../../common/constants';
import { registerGapAutoFillSchedulerTask } from './gap_auto_fill_scheduler_task';
import { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import { rulesClientMock } from '../../../rules_client.mock';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/mocks';
import * as findGapsModule from '../find_gaps';
import * as processGapsBatchModule from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch';
import { Gap } from '../gap';
import { GapFillSchedulePerRuleStatus } from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/types';

jest.mock('../find_gaps');
jest.mock('../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch');
jest.mock('./gap_auto_fill_scheduler_event_log');

const mockedFindGaps = jest.mocked(findGapsModule);
const mockedProcessGapsBatch = jest.mocked(processGapsBatchModule);
const mockedCreateGapAutoFillSchedulerEventLogger = jest.mocked(
  createGapAutoFillSchedulerEventLogger
);

describe('Gap Auto Fill Scheduler Task', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let taskManager: ReturnType<typeof taskManagerMock.createSetup>;
  let eventLogger: ReturnType<typeof eventLoggerMock.create>;
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let mockRequest: KibanaRequest;
  let mockSavedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let mockBackfillClient: ReturnType<typeof backfillClientMock.create>;
  let mockActionsClient: ReturnType<typeof actionsClientMock.create>;
  let mockEventLogClient: ReturnType<typeof eventLogClientMock.create>;
  let logEventMock: jest.Mock;

  const mockConfigId = 'test-config-id';
  const mockTaskInstance = {
    id: 'test-task-id',
    taskType: GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
    scheduledAt: new Date('2024-01-01T00:00:00.000Z'),
    state: {},
    params: { configId: mockConfigId, spaceId: 'default' },
    attempts: 0,
    status: TaskStatus.Idle,
    runAt: new Date('2024-01-01T00:00:00.000Z'),
    startedAt: null,
    retryAt: null,
    ownerId: 'test-owner-id',
  };

  const mockSchedulerConfig = {
    id: mockConfigId,
    name: 'test-scheduler',
    enabled: true,
    schedule: { interval: '1h' },
    gapFillRange: 'now-7d',
    maxBackfills: 100,
    numRetries: 3,
    ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
    scheduledTaskId: 'test-task-id',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'elastic',
    updatedBy: 'elastic',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();
    taskManager = taskManagerMock.createSetup();
    eventLogger = eventLoggerMock.create();
    rulesClient = rulesClientMock.create();
    rulesClient.getRuleIdsWithGaps = jest.fn().mockResolvedValue({ ruleIds: [] });
    mockRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
      getSavedObjectsClient: jest.fn(),
    } as unknown as KibanaRequest;
    mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
    mockBackfillClient = backfillClientMock.create();
    mockActionsClient = actionsClientMock.create();
    mockEventLogClient = eventLogClientMock.create();
    logEventMock = jest.fn();
    mockedCreateGapAutoFillSchedulerEventLogger.mockReturnValue(logEventMock);

    (rulesClient as unknown as { getContext: jest.Mock }).getContext = jest.fn().mockReturnValue({
      unsecuredSavedObjectsClient: mockSavedObjectsRepository,
      internalSavedObjectsRepository: mockSavedObjectsRepository,
      getEventLogClient: jest.fn().mockResolvedValue(mockEventLogClient),
      getActionsClient: jest.fn().mockResolvedValue(mockActionsClient),
      backfillClient: mockBackfillClient,
      spaceId: 'default',
    });

    // By default, no overlapping backfills so we actually process gaps
    mockBackfillClient.findOverlappingBackfills.mockResolvedValue([]);

    // Setup saved object mock
    mockSavedObjectsRepository.get.mockResolvedValue({
      id: mockConfigId,
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: mockSchedulerConfig,
      references: [],
    });

    // Setup rules client find mock - the implementation filters for alert.id: ("alert:rule-id")
    rulesClient.find.mockImplementation((params: Parameters<typeof rulesClient.find>[0]) => {
      const filter = (params as unknown as { options?: { filter?: string } }).options?.filter ?? '';
      const ruleIds: string[] = [];
      for (let i = 1; i <= 25; i++) {
        if (filter.includes(`rule-${i}`)) {
          ruleIds.push(`rule-${i}`);
        }
      }

      return Promise.resolve({
        data: ruleIds.map((id) => ({
          id,
          enabled: true,
          name: `Test Rule ${id}`,
          tags: [],
          schedule: { interval: '1m' },
          params: {},
          alertTypeId: 'test-rule-type',
          consumer: 'test-consumer',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'elastic',
          updatedBy: 'elastic',
          muteAll: false,
          mutedInstanceIds: [],
          notifyWhen: 'onActiveAlert',
          throttle: null,
          executionStatus: {
            status: 'ok',
            lastExecutionDate: new Date(),
          },
          actions: [],
          scheduledTaskId: `task-${id}`,
          apiKeyOwner: 'elastic',
          apiKeyCreatedByUser: false,
          revision: 0,
        })),
        total: ruleIds.length,
        page: 1,
        perPage: ruleIds.length,
      });
    });

    rulesClient.findBackfill.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 1,
    });
  });

  describe('Task Registration', () => {
    it('should register the task with correct configuration', () => {
      const getRulesClientWithRequest = jest.fn().mockResolvedValue(rulesClient);

      registerGapAutoFillSchedulerTask({
        taskManager,
        logger,
        getRulesClientWithRequest,
        eventLogger,
      });

      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith({
        [GAP_AUTO_FILL_SCHEDULER_TASK_TYPE]: {
          title: 'Gap Auto Fill Scheduler',
          timeout: DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('Task Runner Execution', () => {
    let taskRunner: {
      run: () => Promise<unknown>;
      cancel?: (...args: unknown[]) => Promise<unknown>;
    };
    let getRulesClientWithRequest: (
      request: KibanaRequest
    ) => Promise<import('../../../types').RulesClientApi>;

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      getRulesClientWithRequest = jest.fn().mockResolvedValue(rulesClient);

      registerGapAutoFillSchedulerTask({
        taskManager,
        logger,
        getRulesClientWithRequest,
        eventLogger,
      });

      const registeredTask =
        taskManager.registerTaskDefinitions.mock.calls[0][0][GAP_AUTO_FILL_SCHEDULER_TASK_TYPE];
      taskRunner = registeredTask.createTaskRunner({
        taskInstance: mockTaskInstance,
        fakeRequest: mockRequest,
        abortController: new AbortController(),
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const buildRule = (id: string) => ({
      id,
      enabled: true,
      name: `Test Rule ${id}`,
      tags: [],
      schedule: { interval: '1m' },
      params: {},
      alertTypeId: 'test-rule-type',
      consumer: 'test-consumer',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen: 'onActiveAlert' as const,
      throttle: null,
      executionStatus: { status: 'ok' as const, lastExecutionDate: new Date() },
      actions: [],
      scheduledTaskId: `task-${id}`,
      apiKeyOwner: 'elastic',
      apiKeyCreatedByUser: false,
      revision: 0,
    });

    const stubRulesFindOnce = (ruleIds: string[]) => {
      rulesClient.find.mockResolvedValueOnce({
        data: ruleIds.map(buildRule),
        total: ruleIds.length,
        page: 1,
        perPage: ruleIds.length,
      });
    };

    const buildGap = (
      ruleId: string,
      gte: string,
      lte: string,
      status:
        | typeof gapStatus.UNFILLED
        | typeof gapStatus.PARTIALLY_FILLED
        | typeof gapStatus.FILLED
    ): Gap => {
      if (status === gapStatus.FILLED) {
        return new Gap({
          ruleId,
          range: { gte, lte },
          filledIntervals: [{ gte, lte }],
          inProgressIntervals: [],
        });
      }
      if (status === gapStatus.PARTIALLY_FILLED) {
        const midStart = new Date(gte).toISOString();
        return new Gap({
          ruleId,
          range: { gte, lte },
          filledIntervals: [],
          inProgressIntervals: [{ gte: midStart, lte }],
        });
      }
      // UNFILLED
      return new Gap({ ruleId, range: { gte, lte } });
    };

    const stubFindGapsPageOnce = (gaps: Gap[], nextEmpty = true) => {
      mockedFindGaps.findGapsSearchAfter.mockResolvedValueOnce({
        total: gaps.length,
        data: gaps,
        searchAfter: undefined,
        pitId: 'pit-1',
      });
      if (nextEmpty) {
        mockedFindGaps.findGapsSearchAfter.mockResolvedValueOnce({
          total: 0,
          data: [],
          searchAfter: undefined,
          pitId: 'pit-1',
        });
      }
    };

    const stubOverlaps = (...overlaps: boolean[]) => {
      mockBackfillClient.findOverlappingBackfills.mockReset();
      overlaps.forEach((isOverlap, idx) => {
        const res = isOverlap
          ? [
              {
                id: `bf-${idx + 1}`,
                start: '2024-01-01T00:00:00.000Z',
                end: '2024-01-01T01:00:00.000Z',
              },
            ]
          : [];
        mockBackfillClient.findOverlappingBackfills.mockResolvedValueOnce(
          res as Array<{
            id: string;
            start?: string;
            end?: string;
          }>
        );
      });
    };

    const expectProcessCalledWithGaps = (gaps: Gap[]) => {
      expect(mockedProcessGapsBatch.processGapsBatch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ gapsBatch: gaps })
      );
    };

    const expectFinalLog = (status: string, messageContains?: string) => {
      if (messageContains) {
        expect(logEventMock).toHaveBeenCalledWith(
          expect.objectContaining({ status, message: expect.stringContaining(messageContains) })
        );
      } else {
        expect(logEventMock).toHaveBeenCalledWith(expect.objectContaining({ status }));
      }
    };

    const expectProcessNotCalled = () => {
      expect(mockedProcessGapsBatch.processGapsBatch).not.toHaveBeenCalled();
    };

    const expectFindGapsCalledTimes = (times: number) => {
      expect(mockedFindGaps.findGapsSearchAfter).toHaveBeenCalledTimes(times);
    };

    describe('Happy', () => {
      it('should successfully execute when no rules have gaps', async () => {
        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: [] });

        const result = await taskRunner.run();

        expect(result).toEqual({ state: {} });
        expectFinalLog('skipped', 'no rules with gaps');
        expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledWith(
          expect.objectContaining({
            start: expect.any(String),
            end: expect.any(String),
          })
        );
      });

      it('should successfully process rules with gaps', async () => {
        const mockRuleIds = ['rule-1', 'rule-2'];
        const mockGaps: Gap[] = [
          buildGap(
            'rule-1',
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T01:00:00.000Z',
            gapStatus.UNFILLED
          ),
          buildGap(
            'rule-2',
            '2024-01-01T01:00:00.000Z',
            '2024-01-01T02:00:00.000Z',
            gapStatus.PARTIALLY_FILLED
          ),
        ];

        rulesClient.findBackfill.mockResolvedValue({
          data: [],
          total: 50, // Below max capacity
          page: 1,
          perPage: 1,
        });

        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: mockRuleIds });
        // Ensure both rules are selected in this batch
        rulesClient.find.mockResolvedValueOnce({
          data: [
            {
              id: 'rule-1',
              enabled: true,
              name: 'Test Rule rule-1',
              tags: [],
              schedule: { interval: '1m' },
              params: {},
              alertTypeId: 'test-rule-type',
              consumer: 'test-consumer',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'elastic',
              updatedBy: 'elastic',
              muteAll: false,
              mutedInstanceIds: [],
              notifyWhen: 'onActiveAlert',
              throttle: null,
              executionStatus: { status: 'ok', lastExecutionDate: new Date() },
              actions: [],
              scheduledTaskId: 'task-rule-1',
              apiKeyOwner: 'elastic',
              apiKeyCreatedByUser: false,
              revision: 0,
            },
            {
              id: 'rule-2',
              enabled: true,
              name: 'Test Rule rule-2',
              tags: [],
              schedule: { interval: '1m' },
              params: {},
              alertTypeId: 'test-rule-type',
              consumer: 'test-consumer',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'elastic',
              updatedBy: 'elastic',
              muteAll: false,
              mutedInstanceIds: [],
              notifyWhen: 'onActiveAlert',
              throttle: null,
              executionStatus: { status: 'ok', lastExecutionDate: new Date() },
              actions: [],
              scheduledTaskId: 'task-rule-2',
              apiKeyOwner: 'elastic',
              apiKeyCreatedByUser: false,
              revision: 0,
            },
          ],
          total: 2,
          page: 1,
          perPage: 2,
        });
        mockedFindGaps.findGapsSearchAfter
          .mockResolvedValueOnce({
            total: mockGaps.length,
            data: mockGaps,
            searchAfter: undefined,
            pitId: 'test-pit-id',
          })
          .mockResolvedValue({
            total: 0,
            data: [],
            searchAfter: undefined,
            pitId: 'test-pit-id',
          });
        mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
          processedGapsCount: 2,
          hasErrors: false,
          results: [
            { ruleId: 'rule-1', processedGaps: 1, status: GapFillSchedulePerRuleStatus.SUCCESS },
            { ruleId: 'rule-2', processedGaps: 1, status: GapFillSchedulePerRuleStatus.SUCCESS },
          ],
        });

        const result = await taskRunner.run();

        expect(result).toEqual({ state: {} });
        expect(logEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'success',
            message: expect.stringContaining('completed'),
          })
        );
        expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalled();
        expect(mockedFindGaps.findGapsSearchAfter).toHaveBeenCalled();
        expect(mockedProcessGapsBatch.processGapsBatch).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            gapsBatch: mockGaps,
            initiator: backfillInitiator.SYSTEM,
          })
        );
      });
    });

    describe('Capacity', () => {
      it.each([
        {
          name: 'skips when capacity is reached initially',
          capacityTotals: [100],
          setupGaps: false,
          expectedProcessCalls: 0,
          expectMessage: 'no capacity remaining to schedule gap fills',
        },
        {
          name: 'stops when capacity is reached mid-execution',
          capacityTotals: [50, 100],
          setupGaps: true,
          expectedProcessCalls: 1,
          expectMessage: 'no backfill capacity',
        },
      ])(
        'capacity handling: $name',
        async ({ capacityTotals, setupGaps, expectedProcessCalls, expectMessage }) => {
          // Set capacity sequence
          rulesClient.findBackfill.mockReset();
          for (const total of capacityTotals) {
            rulesClient.findBackfill.mockResolvedValueOnce({
              data: [],
              total,
              page: 1,
              perPage: 1,
            });
          }

          if (setupGaps) {
            (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({
              ruleIds: ['rule-1', 'rule-2'],
            });
            const mockGaps: Gap[] = [
              buildGap(
                'rule-1',
                '2024-01-01T00:00:00.000Z',
                '2024-01-01T01:00:00.000Z',
                gapStatus.UNFILLED
              ),
            ];
            mockedFindGaps.findGapsSearchAfter.mockResolvedValue({
              total: mockGaps.length,
              data: mockGaps,
              searchAfter: undefined,
              pitId: 'test-pit-id',
            });
            mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
              processedGapsCount: 1,
              hasErrors: false,
              results: [
                {
                  ruleId: 'rule-1',
                  processedGaps: 1,
                  status: GapFillSchedulePerRuleStatus.SUCCESS,
                },
              ],
            });
          }

          const result = await taskRunner.run();
          expect(result).toEqual({ state: {} });
          expect(mockedProcessGapsBatch.processGapsBatch).toHaveBeenCalledTimes(
            expectedProcessCalls
          );
          expectFinalLog(expectedProcessCalls === 0 ? 'skipped' : 'success', expectMessage);
          if (expectedProcessCalls === 0) {
            expect(rulesClient.getRuleIdsWithGaps).not.toHaveBeenCalled();
          }
        }
      );
      it('respects remaining backfill capacity across rule batches based on capacity checks (e.g., max 100, total 80 -> 20 remaining)', async () => {
        // Capacity pre-check: total=80 (remaining=20). After first batch, capacity reaches max (100)
        rulesClient.findBackfill
          .mockResolvedValueOnce({ data: [], total: 80, page: 1, perPage: 1 })
          .mockResolvedValueOnce({ data: [], total: 100, page: 1, perPage: 1 });

        const ruleIds = Array.from({ length: 200 }, (_, i) => `rule-${i + 1}`);
        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds });

        mockedFindGaps.findGapsSearchAfter.mockResolvedValue({
          total: 0,
          data: [],
          searchAfter: undefined,
          pitId: 'pit-1',
        });

        const result = await taskRunner.run();
        expect(result).toEqual({ state: {} });

        const firstCallArgs = mockedFindGaps.findGapsSearchAfter.mock.calls[0][0];
        const expectedFirstBatchSize = Math.min(DEFAULT_RULES_BATCH_SIZE, 20);
        expect(firstCallArgs.params.ruleIds.length).toBe(expectedFirstBatchSize);

        expectFinalLog('success', 'no backfill capacity (100/100)');
      });
    });

    describe('Errors', () => {
      it('should handle errors during initialization', async () => {
        mockSavedObjectsRepository.get.mockRejectedValue(new Error('Config not found'));

        const result = await taskRunner.run();

        expect(result).toEqual({ state: {} });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('initialization failed'));
        expect(typeof logEventMock).toBe('function');
      });

      it('should handle errors during execution', async () => {
        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockRejectedValue(
          new Error('Failed to get rule IDs')
        );

        const result = await taskRunner.run();

        expect(result).toEqual({ state: {} });
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('error:'));
        expect(logEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: expect.stringContaining('Error during execution:'),
          })
        );
      });

      describe('Cancellation & Metadata', () => {
        it('should handle cancellation', async () => {
          const abortController = new AbortController();

          registerGapAutoFillSchedulerTask({
            taskManager,
            logger,
            getRulesClientWithRequest,
            eventLogger,
          });

          const registeredTask =
            taskManager.registerTaskDefinitions.mock.calls[0][0][GAP_AUTO_FILL_SCHEDULER_TASK_TYPE];
          const taskRunnerWithAbort = registeredTask.createTaskRunner({
            taskInstance: mockTaskInstance,
            fakeRequest: mockRequest,
            abortController,
          });

          rulesClient.findBackfill.mockResolvedValue({ data: [], total: 50, page: 1, perPage: 1 });
          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: ['rule-1'] });

          abortController.abort();
          if (taskRunnerWithAbort.cancel) {
            await taskRunnerWithAbort.cancel();
          }

          const result = await taskRunnerWithAbort.run();

          expect(result).toEqual({ state: {} });
          expect(logEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
              status: 'success',
              results: [],
              message: expect.stringContaining(
                'Gap Auto Fill Scheduler cancelled by timeout | Results: \nprocessed 0 gaps across 0 rules'
              ),
            })
          );
        });

        it('passes task id as initiatorId and SYSTEM initiator to processGapsBatch', async () => {
          rulesClient.findBackfill.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 1 });

          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: ['rule-1'] });

          const gap: Gap = buildGap(
            'rule-1',
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T01:00:00.000Z',
            gapStatus.UNFILLED
          );

          mockedFindGaps.findGapsSearchAfter
            .mockResolvedValueOnce({
              total: 1,
              data: [gap],
              searchAfter: undefined,
              pitId: 'pit-1',
            })
            .mockResolvedValueOnce({ total: 0, data: [], searchAfter: undefined, pitId: 'pit-1' });

          mockBackfillClient.findOverlappingBackfills.mockResolvedValue([]);

          mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
            processedGapsCount: 1,
            hasErrors: false,
            results: [
              { ruleId: 'rule-1', processedGaps: 1, status: GapFillSchedulePerRuleStatus.SUCCESS },
            ],
          });

          const result = await taskRunner.run();
          expect(result).toEqual({ state: {} });

          expect(mockedProcessGapsBatch.processGapsBatch).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
              gapsBatch: [gap],
              initiator: backfillInitiator.SYSTEM,
              initiatorId: mockTaskInstance.id,
            })
          );
        });
      });

      it('logs error when some rules fail to schedule backfills (partial failures)', async () => {
        rulesClient.findBackfill.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 1 });

        const mockRuleIds = ['rule-1', 'rule-2'];
        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: mockRuleIds });
        stubRulesFindOnce(mockRuleIds);

        const gapSuccess: Gap = buildGap(
          'rule-1',
          '2024-01-01T00:00:00.000Z',
          '2024-01-01T01:00:00.000Z',
          gapStatus.UNFILLED
        );
        const gapError: Gap = buildGap(
          'rule-2',
          '2024-01-01T01:00:00.000Z',
          '2024-01-01T02:00:00.000Z',
          gapStatus.UNFILLED
        );

        stubFindGapsPageOnce([gapSuccess, gapError]);
        stubOverlaps(false, false);

        mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
          processedGapsCount: 1,
          hasErrors: true,
          results: [
            { ruleId: 'rule-1', processedGaps: 1, status: GapFillSchedulePerRuleStatus.SUCCESS },
            {
              ruleId: 'rule-2',
              processedGaps: 0,
              status: GapFillSchedulePerRuleStatus.ERROR,
              error: 'Failed to schedule',
            },
          ],
        });

        const result = await taskRunner.run();
        expect(result).toEqual({ state: {} });
        expect(mockedFindGaps.findGapsSearchAfter).toHaveBeenCalled();
      });

      describe('Overlap', () => {
        it.each([
          {
            name: 'filters overlapped and processes only non-overlapped gaps',
            overlaps: [true, false],
            expectedProcessed: 1,
          },
          {
            name: 'filters all gaps when all are overlapped',
            overlaps: [true],
            expectedProcessed: 0,
          },
        ])('$name', async ({ overlaps, expectedProcessed }) => {
          rulesClient.findBackfill.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 1 });
          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: ['rule-2'] });
          stubRulesFindOnce(['rule-2']);

          const gaps: Gap[] = [
            buildGap(
              'rule-2',
              '2024-01-01T00:00:00.000Z',
              '2024-01-01T01:00:00.000Z',
              gapStatus.UNFILLED
            ),
            buildGap(
              'rule-2',
              '2024-01-01T01:00:00.000Z',
              '2024-01-01T02:00:00.000Z',
              gapStatus.UNFILLED
            ),
          ].slice(0, overlaps.length);

          stubFindGapsPageOnce(gaps);
          stubOverlaps(...overlaps);

          mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
            processedGapsCount: expectedProcessed,
            hasErrors: false,
            results: [
              {
                ruleId: 'rule-2',
                processedGaps: expectedProcessed,
                status: GapFillSchedulePerRuleStatus.SUCCESS,
              },
            ],
          });

          const result = await taskRunner.run();
          expect(result).toEqual({ state: {} });

          const expectedToProcess = gaps.filter((_, idx) => overlaps[idx] === false);
          if (expectedProcessed > 0) {
            expectProcessCalledWithGaps(expectedToProcess);
          } else {
            expect(mockedProcessGapsBatch.processGapsBatch).not.toHaveBeenCalled();
          }
        });
      });

      describe('Pagination', () => {
        it('should process rules in batches', async () => {
          const mockRuleIds = Array.from({ length: 250 }, (_, i) => `rule-${i + 1}`);
          const mockGaps: Gap[] = [
            buildGap(
              'rule-1',
              '2024-01-01T00:00:00.000Z',
              '2024-01-01T01:00:00.000Z',
              gapStatus.UNFILLED
            ),
          ];

          rulesClient.findBackfill.mockResolvedValue({
            data: [],
            total: 50, // Below max capacity
            page: 1,
            perPage: 1,
          });

          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: mockRuleIds });
          mockedFindGaps.findGapsSearchAfter
            .mockResolvedValueOnce({
              total: mockGaps.length,
              data: mockGaps,
              searchAfter: undefined,
              pitId: 'test-pit-id',
            })
            .mockResolvedValue({
              total: 0,
              data: [],
              searchAfter: undefined,
              pitId: 'test-pit-id',
            });
          mockedProcessGapsBatch.processGapsBatch.mockResolvedValue({
            processedGapsCount: 1,
            hasErrors: false,
            results: [
              { ruleId: 'rule-1', processedGaps: 1, status: GapFillSchedulePerRuleStatus.SUCCESS },
            ],
          });

          const result = await taskRunner.run();

          expect(result).toEqual({ state: {} });
          expect(rulesClient.find).toHaveBeenCalledTimes(
            Math.ceil(mockRuleIds.length / DEFAULT_RULES_BATCH_SIZE)
          );
          expect(logEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
              status: 'success',
              message: expect.stringContaining('completed'),
            })
          );
        });

        // Covered by capacity handling parametrized test above

        it('[Capacity] respects remaining backfill capacity across rule batches based on capacity checks (e.g., max 100, total 80 -> 20 remaining)', async () => {
          // Capacity pre-check: total=80 (remaining=20). After first batch, capacity reaches max (100)
          rulesClient.findBackfill
            .mockResolvedValueOnce({ data: [], total: 80, page: 1, perPage: 1 })
            .mockResolvedValueOnce({ data: [], total: 100, page: 1, perPage: 1 });

          const ruleIds = Array.from({ length: 200 }, (_, i) => `rule-${i + 1}`);
          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds });

          mockedFindGaps.findGapsSearchAfter.mockResolvedValue({
            total: 0,
            data: [],
            searchAfter: undefined,
            pitId: 'pit-1',
          });

          const result = await taskRunner.run();
          expect(result).toEqual({ state: {} });

          const firstCallArgs = mockedFindGaps.findGapsSearchAfter.mock.calls[0][0];
          const expectedFirstBatchSize = Math.min(DEFAULT_RULES_BATCH_SIZE, 20);
          expect(firstCallArgs.params.ruleIds.length).toBe(expectedFirstBatchSize);

          expect(logEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
              status: 'success',
              message: expect.stringContaining('no backfill capacity (100/100)'),
            })
          );
        });

        it('continues pagination when a full page is entirely filtered by overlap, then stops on empty page', async () => {
          // Ensure isolation from other tests
          mockedFindGaps.findGapsSearchAfter.mockReset();
          mockBackfillClient.findOverlappingBackfills.mockReset();
          rulesClient.findBackfill.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 1 });

          (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: ['rule-1'] });

          const fullPage: Gap[] = Array.from({ length: DEFAULT_GAPS_PER_PAGE }, (_, i) => {
            const minute = String(i % 60).padStart(2, '0');
            return buildGap(
              'rule-1',
              `2024-01-01T00:${minute}:00.000Z`,
              `2024-01-01T00:${minute}:59.000Z`,
              gapStatus.UNFILLED
            );
          });

          mockedFindGaps.findGapsSearchAfter
            .mockResolvedValueOnce({
              total: fullPage.length,
              data: fullPage,
              searchAfter: undefined,
              pitId: 'pit-1',
            })
            .mockResolvedValueOnce({ total: 0, data: [], searchAfter: undefined, pitId: 'pit-1' });

          mockBackfillClient.findOverlappingBackfills.mockResolvedValueOnce([
            {
              id: 'bf-1',
              start: '2024-01-01T00:00:00.000Z',
              end: '2024-01-01T00:59:59.000Z',
            },
          ]);

          const result = await taskRunner.run();
          expect(result).toEqual({ state: {} });

          expectFindGapsCalledTimes(2);
          expectProcessNotCalled();
          expectFinalLog('skipped', "can't schedule gap fills for any enabled rule");
        });
      });

      it('should handle invalid gapFillRange and fallback to default', async () => {
        const invalidConfig = {
          ...mockSchedulerConfig,
          gapFillRange: 'invalid-date-range',
        };

        mockSavedObjectsRepository.get.mockResolvedValue({
          id: mockConfigId,
          type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
          attributes: invalidConfig,
          references: [],
        });

        rulesClient.findBackfill.mockResolvedValue({
          data: [],
          total: 50, // Below max capacity
          page: 1,
          perPage: 1,
        });

        (rulesClient.getRuleIdsWithGaps as jest.Mock).mockResolvedValue({ ruleIds: [] });

        const result = await taskRunner.run();

        expect(result).toEqual({ state: {} });
        expect(logEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: expect.stringContaining('Error during execution:'),
          })
        );
      });

      it('should handle missing request or rules client factory', async () => {
        registerGapAutoFillSchedulerTask({
          taskManager,
          logger,
          // Intentionally undefined to simulate missing factory
          getRulesClientWithRequest: undefined as unknown as (
            request: KibanaRequest
          ) => Promise<import('../../../types').RulesClientApi>,
          eventLogger,
        });

        const registeredTask =
          taskManager.registerTaskDefinitions.mock.calls[0][0][GAP_AUTO_FILL_SCHEDULER_TASK_TYPE];
        const taskRunnerWithoutRequest = registeredTask.createTaskRunner({
          taskInstance: mockTaskInstance,
          fakeRequest: undefined,
          abortController: new AbortController(),
        });

        const result = await taskRunnerWithoutRequest.run();

        expect(result).toEqual({ state: {} });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('initialization failed'));
      });
    });
  });
});
