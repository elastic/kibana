/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { CaseStatuses } from '../../../common/types/domain';
import { findCaseStatusChanges } from './status_changes';

const statusUserAction = (caseId: string, status: unknown, createdAt: string) => ({
  id: `ua-${caseId}-${createdAt}`,
  type: CASE_USER_ACTION_SAVED_OBJECT,
  score: 0,
  attributes: { created_at: createdAt, payload: { status } },
  references: [{ type: CASE_SAVED_OBJECT, name: 'associated-cases', id: caseId }],
});

const mockFinder = (savedObjects: Array<ReturnType<typeof statusUserAction>>) => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const close = jest.fn();
  savedObjectsClient.createPointInTimeFinder.mockReturnValue({
    close,
    async *find() {
      yield { saved_objects: savedObjects, total: savedObjects.length, per_page: 1000, page: 1 };
    },
  } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);

  return { savedObjectsClient, close };
};

describe('findCaseStatusChanges', () => {
  it('groups the status changes by case id', async () => {
    const { savedObjectsClient } = mockFinder([
      statusUserAction('case-1', CaseStatuses.closed, '2026-05-01T01:00:00.000Z'),
      statusUserAction('case-2', CaseStatuses['in-progress'], '2026-05-01T02:00:00.000Z'),
      statusUserAction('case-1', CaseStatuses.open, '2026-05-01T03:00:00.000Z'),
    ]);

    const result = await findCaseStatusChanges({
      savedObjectsClient,
      caseIds: ['case-1', 'case-2', 'case-3'],
    });

    expect(result.get('case-1')).toEqual([
      { status: CaseStatuses.closed, timestamp: '2026-05-01T01:00:00.000Z' },
      { status: CaseStatuses.open, timestamp: '2026-05-01T03:00:00.000Z' },
    ]);
    expect(result.get('case-2')).toEqual([
      { status: CaseStatuses['in-progress'], timestamp: '2026-05-01T02:00:00.000Z' },
    ]);
    expect(result.get('case-3')).toEqual([]);
  });

  it('ignores unknown statuses and other cases', async () => {
    const { savedObjectsClient } = mockFinder([
      statusUserAction('case-1', 'archived', '2026-05-01T01:00:00.000Z'),
      statusUserAction('case-9', CaseStatuses.closed, '2026-05-01T02:00:00.000Z'),
    ]);

    const result = await findCaseStatusChanges({ savedObjectsClient, caseIds: ['case-1'] });

    expect(Array.from(result.entries())).toEqual([['case-1', []]]);
  });

  it('searches all spaces for the status updates of the cases and closes the finder', async () => {
    const { savedObjectsClient, close } = mockFinder([]);

    await findCaseStatusChanges({ savedObjectsClient, caseIds: ['case-1', 'case-2'] });

    expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        namespaces: ['*'],
        hasReference: [
          { type: CASE_SAVED_OBJECT, id: 'case-1' },
          { type: CASE_SAVED_OBJECT, id: 'case-2' },
        ],
        hasReferenceOperator: 'OR',
        sortField: 'created_at',
        sortOrder: 'asc',
      })
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not search when there are no case ids', async () => {
    const { savedObjectsClient } = mockFinder([]);

    const result = await findCaseStatusChanges({ savedObjectsClient, caseIds: [] });

    expect(result.size).toBe(0);
    expect(savedObjectsClient.createPointInTimeFinder).not.toHaveBeenCalled();
  });
});
