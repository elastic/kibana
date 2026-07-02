/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { Logger } from '@kbn/logging';
import type { CeTypeDefinition, CeService } from './types';
import {
  CE_CRAWLER_TASK_TYPE,
  registerCeCrawlerTaskDefinition,
  scheduleCeCrawlerTasks,
} from './ce_task_definitions';

const mockEsClient = {};
const mockSoRepository = {};

const mockUiSettingsClient = { get: jest.fn().mockResolvedValue(true) };
const mockUiSettings = { asScopedToClient: jest.fn().mockReturnValue(mockUiSettingsClient) };

const mockCrawler = { crawl: jest.fn().mockResolvedValue(undefined) };
const mockCeService = {
  getCrawler: jest.fn().mockReturnValue(mockCrawler),
  getTypeDefinition: jest.fn(),
  listTypeDefinitions: jest.fn().mockReturnValue([]),
  search: jest.fn(),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn(),
  getDocuments: jest.fn(),
};
const mockLogger = loggerMock.create();
(mockLogger.get as jest.Mock).mockReturnValue(mockLogger);
const mockGetCrawlerDeps = jest.fn().mockResolvedValue({
  ceService: mockCeService,
  elasticsearch: { client: { asInternalUser: mockEsClient } },
  savedObjects: { createInternalRepository: jest.fn().mockReturnValue(mockSoRepository) },
  uiSettings: mockUiSettings,
  logger: mockLogger,
});

const mockTaskManager = {
  registerTaskDefinitions: jest.fn(),
  ensureScheduled: jest.fn().mockResolvedValue(undefined),
};

const createMockDefinition = (overrides: Partial<CeTypeDefinition> = {}): CeTypeDefinition => ({
  id: 'visualization',
  list: jest.fn(),
  getCeData: jest.fn(),
  toAttachment: jest.fn(),
  ...overrides,
});

const mockAbortController = new AbortController();

function getRegisteredTaskRunner(params: { attachmentType?: string }) {
  registerCeCrawlerTaskDefinition({
    taskManager: mockTaskManager as unknown as TaskManagerSetupContract,
    getCrawlerDeps: mockGetCrawlerDeps,
  });
  const registered = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
  const taskDef = registered[CE_CRAWLER_TASK_TYPE];
  return taskDef.createTaskRunner(
    taskManagerMock.createRunContext({
      taskInstance: { params } as any,
      abortController: mockAbortController,
    })
  );
}

describe('ce_task_definitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettingsClient.get.mockResolvedValue(true);
    mockGetCrawlerDeps.mockResolvedValue({
      ceService: mockCeService,
      elasticsearch: { client: { asInternalUser: mockEsClient } },
      savedObjects: { createInternalRepository: jest.fn().mockReturnValue(mockSoRepository) },
      uiSettings: mockUiSettings,
      logger: mockLogger,
    });
    mockCeService.listTypeDefinitions.mockReturnValue([]);
    mockCeService.getCrawler.mockReturnValue(mockCrawler);
  });

  describe('registerCeCrawlerTaskDefinition', () => {
    it('registers task with correct type', () => {
      registerCeCrawlerTaskDefinition({
        taskManager: mockTaskManager as unknown as TaskManagerSetupContract,
        getCrawlerDeps: mockGetCrawlerDeps,
      });

      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      const callArg = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
      expect(callArg).toHaveProperty(CE_CRAWLER_TASK_TYPE);
      expect(callArg[CE_CRAWLER_TASK_TYPE]).toMatchObject({
        title: 'Context Engine: Crawler',
        timeout: '10m',
        maxAttempts: 3,
      });
      expect(callArg[CE_CRAWLER_TASK_TYPE].createTaskRunner).toBeDefined();
    });
  });

  describe('task runner', () => {
    it('returns {state:{}} when no attachmentType', async () => {
      const runner = getRegisteredTaskRunner({});

      const result = await runner.run();

      expect(result).toEqual({ state: {} });
      expect(mockGetCrawlerDeps).not.toHaveBeenCalled();
    });

    it('skips crawl when the Context Engine is disabled', async () => {
      mockUiSettingsClient.get.mockResolvedValue(false);
      const definition = createMockDefinition({ id: 'visualization' });
      mockCeService.getTypeDefinition.mockReturnValue(definition);

      const runner = getRegisteredTaskRunner({ attachmentType: 'visualization' });
      const result = await runner.run();

      expect(result).toEqual({ state: {} });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "CE crawler: Context Engine disabled — skipping crawl for type 'visualization'"
      );
      expect(mockCrawler.crawl).not.toHaveBeenCalled();
    });

    it('awaits getCrawlerDeps and calls crawler.crawl with correct params', async () => {
      const definition = createMockDefinition({ id: 'visualization' });
      mockCeService.getTypeDefinition.mockReturnValue(definition);
      mockCeService.listTypeDefinitions.mockReturnValue([definition]);

      const runner = getRegisteredTaskRunner({ attachmentType: 'visualization' });
      await runner.run();

      expect(mockGetCrawlerDeps).toHaveBeenCalled();
      expect(mockCrawler.crawl).toHaveBeenCalledWith({
        definition,
        esClient: mockEsClient,
        savedObjectsClient: mockSoRepository,
        abortSignal: mockAbortController.signal,
      });
    });

    it('warns and returns when type definition not found', async () => {
      mockCeService.getTypeDefinition.mockReturnValue(undefined);
      mockCeService.listTypeDefinitions.mockReturnValue([{ id: 'dashboard' }]);

      const runner = getRegisteredTaskRunner({ attachmentType: 'unknown-type' });
      const result = await runner.run();

      expect(result).toEqual({ state: {} });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "CE crawler task: type definition 'unknown-type' not found — skipping. Registered types: [dashboard]"
      );
      expect(mockCrawler.crawl).not.toHaveBeenCalled();
    });

    it('catches and logs crawler.crawl errors', async () => {
      const definition = createMockDefinition({ id: 'visualization' });
      mockCeService.getTypeDefinition.mockReturnValue(definition);
      mockCrawler.crawl.mockRejectedValue(new Error('crawl failed'));

      const runner = getRegisteredTaskRunner({ attachmentType: 'visualization' });
      const result = await runner.run();

      expect(result).toEqual({ state: {} });
      expect(mockLogger.error).toHaveBeenCalledWith(
        "CE crawler task failed for type 'visualization': crawl failed"
      );
    });
  });

  describe('scheduleCeCrawlerTasks', () => {
    it('schedules a task per registered type', async () => {
      const def1 = createMockDefinition({ id: 'visualization' });
      const def2 = createMockDefinition({ id: 'dashboard' });
      mockCeService.listTypeDefinitions.mockReturnValue([def1, def2]);

      await scheduleCeCrawlerTasks({
        taskManager: mockTaskManager as unknown as TaskManagerStartContract,
        ceService: mockCeService as unknown as CeService,
        logger: mockLogger as unknown as Logger,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.ensureScheduled).toHaveBeenNthCalledWith(1, {
        id: 'context_engine:ce_crawler:visualization',
        taskType: CE_CRAWLER_TASK_TYPE,
        params: { attachmentType: 'visualization' },
        schedule: { interval: '10m' },
        scope: ['contextEngine'],
        state: {},
      });
      expect(mockTaskManager.ensureScheduled).toHaveBeenNthCalledWith(2, {
        id: 'context_engine:ce_crawler:dashboard',
        taskType: CE_CRAWLER_TASK_TYPE,
        params: { attachmentType: 'dashboard' },
        schedule: { interval: '10m' },
        scope: ['contextEngine'],
        state: {},
      });
    });

    it('uses custom fetchFrequency when provided', async () => {
      const def = createMockDefinition({
        id: 'visualization',
        fetchFrequency: () => '5m',
      });
      mockCeService.listTypeDefinitions.mockReturnValue([def]);

      await scheduleCeCrawlerTasks({
        taskManager: mockTaskManager as unknown as TaskManagerStartContract,
        ceService: mockCeService as unknown as CeService,
        logger: mockLogger as unknown as Logger,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '5m' },
        })
      );
    });

    it('defaults to 10m interval', async () => {
      const def = createMockDefinition({ id: 'visualization' });
      mockCeService.listTypeDefinitions.mockReturnValue([def]);

      await scheduleCeCrawlerTasks({
        taskManager: mockTaskManager as unknown as TaskManagerStartContract,
        ceService: mockCeService as unknown as CeService,
        logger: mockLogger as unknown as Logger,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '10m' },
        })
      );
    });

    it('logs error when ensureScheduled fails', async () => {
      const def = createMockDefinition({ id: 'visualization' });
      mockCeService.listTypeDefinitions.mockReturnValue([def]);
      mockTaskManager.ensureScheduled.mockRejectedValue(new Error('schedule failed'));

      await scheduleCeCrawlerTasks({
        taskManager: mockTaskManager as unknown as TaskManagerStartContract,
        ceService: mockCeService as unknown as CeService,
        logger: mockLogger as unknown as Logger,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to schedule CE crawler task for type 'visualization': schedule failed"
      );
    });
  });
});
