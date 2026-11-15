/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_OBSERVABLE_SAVED_OBJECT } from '../../../common/constants';
import { deleteObservablesOfCases, OBSERVABLES_DELETE_PAGE_SIZE } from './delete_for_cases';

const searchPage = (ids: string[]) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: {
    hits: ids.map((id) => ({
      _index: '.kibana_alerting_cases',
      _id: `${CASE_OBSERVABLE_SAVED_OBJECT}:${id}`,
    })),
  },
});

describe('deleteObservablesOfCases', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient.bulkDelete.mockImplementation(async (objects) => ({
      statuses: objects.map(({ id, type }) => ({ id, type, success: true })),
    }));
  });

  it('deletes a page at a time until the cases have no observables left', async () => {
    const firstPage = Array.from({ length: OBSERVABLES_DELETE_PAGE_SIZE }, (_, i) => `obs-${i}`);
    savedObjectsClient.search
      .mockResolvedValueOnce(searchPage(firstPage))
      .mockResolvedValueOnce(searchPage(['obs-last']))
      .mockResolvedValueOnce(searchPage([]));

    const deleted = await deleteObservablesOfCases({
      savedObjectsClient,
      caseIds: ['case-1', 'case-2'],
      namespace: 'space-1',
      isInternalClient: true,
      logger,
    });

    expect(deleted).toBe(OBSERVABLES_DELETE_PAGE_SIZE + 1);
    expect(savedObjectsClient.search).toHaveBeenCalledTimes(3);
    expect(savedObjectsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ type: CASE_OBSERVABLE_SAVED_OBJECT, namespaces: ['space-1'] })
    );
    expect(savedObjectsClient.bulkDelete).toHaveBeenLastCalledWith(
      [{ type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'obs-last' }],
      { refresh: 'wait_for', namespace: 'space-1' }
    );
  });

  it('lets a scoped client delete in its own space', async () => {
    savedObjectsClient.search
      .mockResolvedValueOnce(searchPage(['obs-1']))
      .mockResolvedValueOnce(searchPage([]));

    await deleteObservablesOfCases({
      savedObjectsClient,
      caseIds: ['case-1'],
      namespace: 'default',
      logger,
    });

    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
      [{ type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'obs-1' }],
      { refresh: 'wait_for' }
    );
  });

  it('ignores observables that are already gone and throws on other failures', async () => {
    savedObjectsClient.search.mockResolvedValue(searchPage(['obs-1', 'obs-2']));
    savedObjectsClient.bulkDelete.mockResolvedValueOnce({
      statuses: [
        {
          id: 'obs-1',
          type: CASE_OBSERVABLE_SAVED_OBJECT,
          success: false,
          error: { statusCode: 404, error: 'Not found', message: 'gone' },
        },
        {
          id: 'obs-2',
          type: CASE_OBSERVABLE_SAVED_OBJECT,
          success: false,
          error: { statusCode: 500, error: 'Internal', message: 'boom' },
        },
      ],
    });

    await expect(
      deleteObservablesOfCases({
        savedObjectsClient,
        caseIds: ['case-1'],
        namespace: 'default',
        logger,
      })
    ).rejects.toThrow('Failed to delete 1 observables of cases [case-1]: obs-2: boom');
  });

  it('does nothing without cases', async () => {
    await expect(
      deleteObservablesOfCases({ savedObjectsClient, caseIds: [], namespace: 'default', logger })
    ).resolves.toBe(0);
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });
});
