/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { subscribeToDualProcessFlag } from './dual_process';
import { ENGINE_STATUS } from '../../domain/constants';
import { EngineDescriptorTypeName } from '../../domain/saved_objects';

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
  savedObjects: { saved_objects: ReturnType<typeof makeEngineDescriptorSo>[] },
  flagOnStartup?: boolean
): CoreStart {
  const mockInternalRepo = {
    find: jest.fn().mockResolvedValue(savedObjects),
    update: jest.fn().mockResolvedValue({}),
  };

  const getBooleanValue =
    flagOnStartup !== undefined
      ? jest.fn().mockResolvedValue(flagOnStartup)
      : jest.fn().mockRejectedValue(new Error('getBooleanValue not mocked for this test'));

  return {
    featureFlags: {
      getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
      getBooleanValue,
    },
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(mockInternalRepo),
    },
  } as unknown as CoreStart;
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

  describe('startup reconciliation', () => {
    it('runs teardownNonPriorityTasks when flag is off on startup', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STARTED,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] }, false);
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      await flushPromises();

      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({
          nonPriorityStatus: ENGINE_STATUS.STOPPED,
          nonPriorityLogExtractionState: null,
          nonPriorityError: null,
        }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('runs enableNonPriorityTasks when flag is on on startup', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] }, true);
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      await flushPromises();

      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default' })
      );
    });
  });

  describe('true -> false: teardown', () => {
    it('clears SO fields for a started user engine', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({
          nonPriorityStatus: ENGINE_STATUS.STOPPED,
          nonPriorityLogExtractionState: null,
          nonPriorityError: null,
        }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('skips engines where nonPriorityStatus is not started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', { nonPriorityStatus: null });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
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
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('false -> true: re-enable', () => {
    it('sets nonPriorityStatus to started for an eligible engine (was stopped)', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('skips engines where nonPriorityStatus is already started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STARTED,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('skips engines where status is not started', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default', {
        status: ENGINE_STATUS.STOPPED,
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
      });
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('no-op cases', () => {
    it('does nothing when the value does not change (true -> true)', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(true);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does nothing after stop$ emits', async () => {
      const flagSubject = new Subject<boolean>();
      const soRow = makeEngineDescriptorSo('user', 'default');
      const coreStart = buildCoreStart(flagSubject, { saved_objects: [soRow] });
      const mockUpdate = (
        coreStart.savedObjects.createInternalRepository() as unknown as { update: jest.Mock }
      ).update;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      stop$.next();
      stop$.complete();

      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('rapid flip', () => {
    it('processes true -> false -> true sequentially without interleaving', async () => {
      const flagSubject = new Subject<boolean>();
      const soRowStarted = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STARTED,
      });
      const soRowStopped = makeEngineDescriptorSo('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
      });

      const mockFind = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [soRowStarted] })
        .mockResolvedValueOnce({ saved_objects: [soRowStopped] });

      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockInternalRepo = { find: mockFind, update: mockUpdate };
      const coreStart = {
        featureFlags: {
          getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
          getBooleanValue: jest
            .fn()
            .mockRejectedValue(new Error('getBooleanValue not mocked for this test')),
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(mockInternalRepo),
        },
      } as unknown as CoreStart;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      // Emit all three values synchronously - concatMap must serialise them.
      flagSubject.next(true);
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      // Teardown ran first (true -> false): sets nonPriorityStatus to STOPPED.
      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
        expect.objectContaining({ namespace: 'default' })
      );

      // Re-enable ran second (false -> true): sets nonPriorityStatus back to STARTED.
      expect(mockUpdate).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default' })
      );

      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
