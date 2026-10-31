/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { scanCases } from './scan_cases';
import { OBSERVABLES_SYNC_PAGE_SIZE, OBSERVABLES_SYNC_PIT_KEEP_ALIVE } from './types';

const buildCases = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({
    id: `case-${offset + index}`,
    type: CASE_SAVED_OBJECT,
    references: [],
    attributes: {},
    score: 0,
    sort: [`sort-${offset + index}`],
  })) as unknown as Array<SavedObject<CasePersistedAttributes>>;

const page = (cases: Array<SavedObject<CasePersistedAttributes>>, pitId = 'pit-1') => ({
  saved_objects: cases,
  total: cases.length,
  per_page: OBSERVABLES_SYNC_PAGE_SIZE,
  page: 1,
  pit_id: pitId,
});

describe('scanCases', () => {
  const filter = 'cases.attributes.observables:{ value: * }';
  let repo: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let handleCase: jest.Mock;

  const scan = (overrides: Partial<Parameters<typeof scanCases>[0]> = {}) =>
    scanCases({
      repo,
      logger,
      filter,
      caseBudget: Number.MAX_SAFE_INTEGER,
      shouldPause: () => false,
      handleCase,
      ...overrides,
    });

  beforeEach(() => {
    repo = savedObjectsRepositoryMock.create();
    logger = loggingSystemMock.createLogger();
    handleCase = jest.fn().mockResolvedValue(undefined);
    repo.openPointInTimeForType.mockResolvedValue({ id: 'pit-1' });
    repo.closePointInTime.mockResolvedValue({ succeeded: true, num_freed: 1 });
  });

  it('scans the cases of every space over a point in time and closes it when done', async () => {
    repo.find.mockResolvedValue(page(buildCases(2)) as never);

    const result = await scan();

    expect(result).toEqual({ outcome: 'complete', scanned: 2 });
    expect(handleCase).toHaveBeenCalledTimes(2);
    expect(repo.openPointInTimeForType).toHaveBeenCalledWith(CASE_SAVED_OBJECT, {
      namespaces: ['*'],
      keepAlive: OBSERVABLES_SYNC_PIT_KEEP_ALIVE,
    });
    expect(repo.find).toHaveBeenCalledWith({
      type: CASE_SAVED_OBJECT,
      namespaces: ['*'],
      perPage: OBSERVABLES_SYNC_PAGE_SIZE,
      pit: { id: 'pit-1', keepAlive: OBSERVABLES_SYNC_PIT_KEEP_ALIVE },
      filter,
    });
    expect(repo.closePointInTime).toHaveBeenCalledWith('pit-1');
  });

  it('continues from the last sort values of the previous page', async () => {
    repo.find
      .mockResolvedValueOnce(page(buildCases(OBSERVABLES_SYNC_PAGE_SIZE)) as never)
      .mockResolvedValueOnce(page(buildCases(3, OBSERVABLES_SYNC_PAGE_SIZE)) as never);

    const result = await scan();

    expect(result).toEqual({ outcome: 'complete', scanned: OBSERVABLES_SYNC_PAGE_SIZE + 3 });
    expect(repo.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchAfter: [`sort-${OBSERVABLES_SYNC_PAGE_SIZE - 1}`] })
    );
  });

  it('pauses at the case budget and returns where to resume, keeping the point in time open', async () => {
    repo.find.mockResolvedValue(page(buildCases(OBSERVABLES_SYNC_PAGE_SIZE)) as never);

    const result = await scan({ caseBudget: OBSERVABLES_SYNC_PAGE_SIZE });

    expect(result).toEqual({
      outcome: 'paused',
      scanned: OBSERVABLES_SYNC_PAGE_SIZE,
      cursor: { pitId: 'pit-1', searchAfter: [`sort-${OBSERVABLES_SYNC_PAGE_SIZE - 1}`] },
    });
    expect(repo.closePointInTime).not.toHaveBeenCalled();
  });

  it('pauses before reading when asked to, and resumes from a given cursor without opening a point in time', async () => {
    const cursor = { pitId: 'pit-9', searchAfter: ['sort-5'] };

    const paused = await scan({ cursor, shouldPause: () => true });
    expect(paused).toEqual({ outcome: 'paused', scanned: 0, cursor });
    expect(repo.find).not.toHaveBeenCalled();

    repo.find.mockResolvedValue(page(buildCases(1), 'pit-9') as never);
    await scan({ cursor });
    expect(repo.openPointInTimeForType).not.toHaveBeenCalled();
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: expect.objectContaining({ id: 'pit-9' }),
        searchAfter: ['sort-5'],
      })
    );
  });

  it('reopens a point in time that expired and scans again from the start, once', async () => {
    repo.openPointInTimeForType.mockResolvedValueOnce({ id: 'pit-new' });
    repo.find
      .mockRejectedValueOnce(new Error('pit expired'))
      .mockResolvedValueOnce(page(buildCases(1), 'pit-new') as never);

    const result = await scan({ cursor: { pitId: 'pit-old', searchAfter: ['sort-5'] } });

    expect(result).toEqual({ outcome: 'complete', scanned: 1 });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(repo.find).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ searchAfter: expect.anything() })
    );
  });

  it('closes the point in time and throws when a reopened one fails again', async () => {
    repo.find.mockRejectedValue(new Error('still failing'));

    await expect(scan({ cursor: { pitId: 'pit-old' } })).rejects.toThrow('still failing');
    expect(repo.closePointInTime).toHaveBeenCalled();
  });
});
