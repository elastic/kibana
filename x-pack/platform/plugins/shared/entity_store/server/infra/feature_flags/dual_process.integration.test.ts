/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration-level coverage for the dual-process feature flag reactive path.
 *
 * These tests wire the real `subscribeToDualProcessFlag`, `teardownNonPriorityTasks`, and
 * `enableNonPriorityTasks` implementations against a mock saved-objects repository whose
 * `find` / `update` calls are verified at the boundary. No internal helpers are replaced —
 * the intent is to catch regressions that unit tests miss because they mock sub-functions.
 *
 * Tracked in: https://github.com/elastic/kibana/issues/288610
 */

import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { subscribeToDualProcessFlag } from './dual_process';
import { ENGINE_STATUS } from '../../domain/constants';
import { EngineDescriptorTypeName } from '../../domain/saved_objects';
import type { EngineDescriptor } from '../../domain/saved_objects';

/** Waits for all pending microtasks (Promise resolutions and concatMap callbacks). */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function makeSavedObject(
  type: string,
  namespace: string,
  overrides: Partial<EngineDescriptor> = {}
) {
  return {
    id: `entity-engine-descriptor-${type}-${namespace}`,
    type: EngineDescriptorTypeName,
    attributes: {
      type,
      status: ENGINE_STATUS.STARTED,
      nonPriorityStatus: ENGINE_STATUS.STARTED,
      ...overrides,
    } as EngineDescriptor,
    namespaces: [namespace],
    references: [],
    score: 0,
  };
}

function buildCoreStart(
  flagSubject: Subject<boolean>,
  findResult: { saved_objects: ReturnType<typeof makeSavedObject>[] },
  flagOnStartup?: boolean
): { coreStart: CoreStart; mockRepo: ReturnType<typeof savedObjectsRepositoryMock.create> } {
  const mockRepo = savedObjectsRepositoryMock.create();
  mockRepo.find.mockResolvedValue({
    ...findResult,
    total: findResult.saved_objects.length,
    per_page: 10_000,
    page: 1,
  });
  mockRepo.update.mockResolvedValue({} as never);

  const getBooleanValue =
    flagOnStartup !== undefined
      ? jest.fn().mockResolvedValue(flagOnStartup)
      : jest.fn().mockRejectedValue(new Error('getBooleanValue not mocked for this test'));

  const coreStart = {
    featureFlags: {
      getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
      getBooleanValue,
    },
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(mockRepo),
    },
  } as unknown as CoreStart;

  return { coreStart, mockRepo };
}

describe('dual-process FF reactive path — integration', () => {
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

  // ---------------------------------------------------------------------------
  // SO boundary: teardown path
  // ---------------------------------------------------------------------------

  describe('FF true -> false: teardownNonPriorityTasks SO writes', () => {
    it('writes nonPriorityStatus=stopped, clears cursor and error for a started user engine', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default');
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, { saved_objects: [so] });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockRepo.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({
          nonPriorityStatus: ENGINE_STATUS.STOPPED,
          nonPriorityLogExtractionState: null,
          nonPriorityError: null,
        }),
        expect.objectContaining({ namespace: 'default', mergeAttributes: true })
      );
    });

    it('does not write to SO for engines where nonPriorityStatus is already stopped', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STOPPED });
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, { saved_objects: [so] });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('does not write to SO for types without a priority gate (host, service, generic)', async () => {
      const flagSubject = new Subject<boolean>();
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, {
        saved_objects: [
          makeSavedObject('host', 'default'),
          makeSavedObject('service', 'default'),
          makeSavedObject('generic', 'default'),
        ],
      });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('handles multiple spaces: writes to each matching engine in its own namespace', async () => {
      const flagSubject = new Subject<boolean>();
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, {
        saved_objects: [
          makeSavedObject('user', 'space-a'),
          makeSavedObject('user', 'space-b'),
        ],
      });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(true);
      flagSubject.next(false);
      await flushPromises();

      expect(mockRepo.update).toHaveBeenCalledTimes(2);
      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
        expect.objectContaining({ namespace: 'space-a' })
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
        expect.objectContaining({ namespace: 'space-b' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SO boundary: re-enable path
  // ---------------------------------------------------------------------------

  describe('FF false -> true: enableNonPriorityTasks SO writes', () => {
    it('writes nonPriorityStatus=started for an engine that was stopped', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STOPPED });
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, { saved_objects: [so] });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockRepo.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default', mergeAttributes: true })
      );
    });

    it('does not write to SO if the engine itself is not started', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', {
        status: ENGINE_STATUS.STOPPED,
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
      });
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, { saved_objects: [so] });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('does not double-enable an engine already in started state', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', {
        nonPriorityStatus: ENGINE_STATUS.STARTED,
      });
      const { coreStart, mockRepo } = buildCoreStart(flagSubject, { saved_objects: [so] });

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Startup reconciliation
  // ---------------------------------------------------------------------------

  describe('startup reconciliation', () => {
    it('tears down started engines on startup when FF is off', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STARTED });
      const { coreStart, mockRepo } = buildCoreStart(
        flagSubject,
        { saved_objects: [so] },
        false // FF is off
      );

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      await flushPromises();

      expect(mockRepo.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STOPPED }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('enables stopped engines on startup when FF is on', async () => {
      const flagSubject = new Subject<boolean>();
      const so = makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STOPPED });
      const { coreStart, mockRepo } = buildCoreStart(
        flagSubject,
        { saved_objects: [so] },
        true // FF is on
      );

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });
      await flushPromises();

      expect(mockRepo.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.stringContaining('user'),
        expect.objectContaining({ nonPriorityStatus: ENGINE_STATUS.STARTED }),
        expect.objectContaining({ namespace: 'default' })
      );
    });

    it('logs an error and does not throw when the startup reconciliation fails', async () => {
      const flagSubject = new Subject<boolean>();
      const { coreStart } = buildCoreStart(flagSubject, { saved_objects: [] });
      (coreStart.featureFlags.getBooleanValue as jest.Mock).mockRejectedValue(
        new Error('LD unreachable')
      );

      expect(() =>
        subscribeToDualProcessFlag({ coreStart, logger, stop$ })
      ).not.toThrow();

      await flushPromises();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Dual-process startup reconciliation failed')
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Concurrency: rapid flip is serialised
  // ---------------------------------------------------------------------------

  describe('rapid flag flip is processed sequentially', () => {
    it('teardown completes before re-enable starts (true -> false -> true)', async () => {
      const flagSubject = new Subject<boolean>();
      const calls: string[] = [];

      const mockRepo = savedObjectsRepositoryMock.create();
      mockRepo.find
        .mockResolvedValueOnce({
          saved_objects: [makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STARTED })],
          total: 1,
          per_page: 10_000,
          page: 1,
        })
        .mockResolvedValue({
          saved_objects: [makeSavedObject('user', 'default', { nonPriorityStatus: ENGINE_STATUS.STOPPED })],
          total: 1,
          per_page: 10_000,
          page: 1,
        });

      mockRepo.update.mockImplementation(async (_type, _id, attrs) => {
        const status = (attrs as Partial<EngineDescriptor>).nonPriorityStatus;
        calls.push(status === ENGINE_STATUS.STOPPED ? 'teardown' : 'enable');
        return {} as never;
      });

      const coreStart = {
        featureFlags: {
          getBooleanValue$: jest.fn().mockReturnValue(flagSubject.asObservable()),
          getBooleanValue: jest.fn().mockRejectedValue(new Error('not mocked')),
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(mockRepo),
        },
      } as unknown as CoreStart;

      subscribeToDualProcessFlag({ coreStart, logger, stop$ });

      flagSubject.next(true);
      flagSubject.next(false);
      flagSubject.next(true);
      await flushPromises();

      expect(calls).toEqual(['teardown', 'enable']);
    });
  });
});
