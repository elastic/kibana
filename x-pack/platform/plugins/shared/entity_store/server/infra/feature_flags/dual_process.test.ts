/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { subscribeToDualProcessFlag } from './dual_process';
import { stopExtractEntityTask } from '../../tasks/extract_entity_task';
import { ENGINE_STATUS } from '../../domain/constants';
import { EngineDescriptorTypeName } from '../../domain/saved_objects';
import { EXTRACTION_MODE } from '../../../common/domain/definitions/entity_schema';

jest.mock('../../tasks/extract_entity_task', () => ({
  stopExtractEntityTask: jest.fn(),
  getExtractEntityTaskConfig: jest.requireActual('../../tasks/extract_entity_task')
    .getExtractEntityTaskConfig,
  getExtractEntityTaskId: jest.requireActual('../../tasks/extract_entity_task')
    .getExtractEntityTaskId,
}));

const mockStopExtractEntityTask = stopExtractEntityTask as jest.MockedFunction<
  typeof stopExtractEntityTask
>;

function makeEngineDescriptorSo(
  type: string,
  namespace: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    attributes: {
      type,
      status: ENGINE_STATUS.STARTED,
      nonPriorityStatus: ENGINE_STATUS.STARTED,
      ...overrides,
    },
    namespaces: [namespace],
  };
}

function buildCoreStart(
  flagSubject: Subject<boolean>,
  savedObjects: { saved_objects: ReturnType<typeof makeEngineDescriptorSo>[] }
): CoreStart {
  const mockInternalRepo = {
    find: jest.fn().mockResolvedValue(savedObjects),
    update: jest.fn().mockResolvedValue({}),
  };

  return {
    featureFlags: {
      getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
    },
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(mockInternalRepo),
    },
  } as unknown as CoreStart;
}

function buildTaskManager(): jest.Mocked<
  Pick<TaskManagerStartContract, 'ensureScheduled' | 'removeIfExists'>
> {
  return {
    ensureScheduled: jest.fn().mockResolvedValue({}),
    removeIfExists: jest.fn().mockResolvedValue({}),
  };
}

/** Waits for all pending microtasks (Promise resolutions and concatMap callbacks). */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('subscribeToDualProcessFlag', () => {
  let stop$: Subject<void>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    stop$ = new Subject<void>();
    logger = loggerMock.create();
  });

  afterEach(() => {
    stop$.next();
    stop$.complete();
  });

  describe('true -> false: teardown', () => {
    it('removes the non-priority task and clears SO fields for a started user engine', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockStopExtractEntityTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'user', namespace: 'default', extractionMode: EXTRACTION_MODE.nonPriority })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: null, nonPriorityLogExtractionState: null, nonPriorityError: null }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('skips engines where nonPriorityStatus is not started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: null });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockStopExtractEntityTask).not.toHaveBeenCalled();
    });

    it('skips types without a priority extraction gate (host, service, generic)', async () => {
      const flagSubject = new Subject<boolean>();
      const coreStart = buildCoreStart(flagSubject, {
        saved_objects: [
          makeEngineDescriptorSo('host', 'default'),
          makeEngineDescriptorSo('service', 'default'),
          makeEngineDescriptorSo('generic', 'default'),
        ],
      });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockStopExtractEntityTask).not.toHaveBeenCalled();
    });
  });

  describe('false -> true: re-enable', () => {
    it('schedules the non-priority task and sets nonPriorityStatus for an eligible engine', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: null });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('user'),
          taskType: expect.stringContaining('non_priority'),
          state: { namespace: 'default' },
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('skips engines where nonPriorityStatus is already started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STARTED });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('skips engines where status is not started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        status: ENGINE_STATUS.STOPPED,
        nonPriorityStatus: null,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });
  });

  describe('no-op cases', () => {
    it('does nothing when the value does not change (true -> true)', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(true);
      await flushPromises();

      expect(mockStopExtractEntityTask).not.toHaveBeenCalled();
      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('does nothing after stop$ emits', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      stop$.next();
      stop$.complete();

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockStopExtractEntityTask).not.toHaveBeenCalled();
    });
  });

  describe('rapid flip', () => {
    it('processes true -> false -> true sequentially without interleaving', async () => {
      const flagSubject = new Subject<boolean>();
      const soRowStarted = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STARTED });
      const soRowCleared = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: null });

      const mockFind = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [soRowStarted] })
        .mockResolvedValueOnce({ saved_objects: [soRowCleared] });

      const mockInternalRepo = {
        find: mockFind,
        update: jest.fn().mockResolvedValue({}),
      };
      const coreStart = {
        featureFlags: {
          getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(mockInternalRepo),
        },
      } as unknown as CoreStart;
      const taskManager = buildTaskManager();

      subscribeToDualProcessFlag({ coreStart, taskManager: taskManager as unknown as TaskManagerStartContract, logger, stop$ });

      // Emit all three values synchronously — concatMap must serialise them.
      flagSubject.next(true);
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      // Teardown ran first (true -> false), then re-enable (false -> true).
      expect(mockStopExtractEntityTask).toHaveBeenCalledTimes(1);
      expect(taskManager.ensureScheduled).toHaveBeenCalledTimes(1);
    });
  });
});
