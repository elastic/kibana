/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectErrorResult,
  SavedObjectsBulkCreateObject,
} from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { deriveObservableId } from '../../client/cases/observables_storage';
import { buildObservableAttachments, migrateObservablesPage } from './migrate_observables_page';
import type { LegacyCase } from './scan_cases';

const MIGRATED_AT = '2026-11-05T00:00:00.000Z';

const legacyCase = (overrides: Partial<LegacyCase> = {}): LegacyCase => ({
  id: 'case-1',
  owner: 'securitySolution',
  namespaces: ['space-a'],
  observables: [
    {
      id: 'legacy-1',
      typeKey: 'observable-type-ipv4',
      value: '10.0.0.1',
      description: 'Auto extracted observable',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    },
  ],
  ...overrides,
});

const createdResult = ({ id = '' }: SavedObjectsBulkCreateObject): SavedObject<unknown> => ({
  id,
  type: CASE_ATTACHMENT_SAVED_OBJECT,
  attributes: {},
  references: [],
});

const errorResult = (
  { id = '' }: SavedObjectsBulkCreateObject,
  statusCode: number,
  message: string
): SavedObjectErrorResult => ({
  id,
  type: CASE_ATTACHMENT_SAVED_OBJECT,
  error: { statusCode, error: 'Error', message },
});

describe('buildObservableAttachments', () => {
  it('maps a legacy observable to an observable attachment with a derived id', () => {
    const { objects, collapsed, invalid } = buildObservableAttachments(legacyCase(), MIGRATED_AT);

    expect(collapsed).toBe(0);
    expect(invalid).toBe(0);
    expect(objects).toEqual([
      {
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        id: deriveObservableId({
          caseId: 'case-1',
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.1',
        }),
        attributes: {
          type: 'observable',
          owner: 'securitySolution',
          data: {
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.1',
            description: 'Auto extracted observable',
            legacyId: 'legacy-1',
          },
          created_at: '2025-01-01T00:00:00.000Z',
          created_by: { email: null, full_name: null, username: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: '2025-01-02T00:00:00.000Z',
          updated_by: null,
        },
        references: [
          { type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: 'case-1' },
        ],
        initialNamespaces: ['space-a'],
      },
    ]);
  });

  it('collapses observables with the same type key and value', () => {
    const [observable] = legacyCase().observables;
    const { objects, collapsed } = buildObservableAttachments(
      legacyCase({ observables: [observable, { ...observable, id: 'legacy-2' }] }),
      MIGRATED_AT
    );

    expect(objects).toHaveLength(1);
    expect(collapsed).toBe(1);
  });

  it('counts observables without a type key or value as invalid', () => {
    const { objects, invalid } = buildObservableAttachments(
      legacyCase({ observables: [{ id: 'legacy-1', typeKey: 'observable-type-ipv4' }] }),
      MIGRATED_AT
    );

    expect(objects).toEqual([]);
    expect(invalid).toBe(1);
  });

  it('uses the migration time when an observable has no creation time', () => {
    const { objects } = buildObservableAttachments(
      legacyCase({
        observables: [{ id: 'legacy-1', typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      }),
      MIGRATED_AT
    );

    expect(objects[0].attributes).toEqual(
      expect.objectContaining({
        created_at: MIGRATED_AT,
        updated_at: null,
        data: expect.objectContaining({ description: null }),
      })
    );
  });
});

describe('migrateObservablesPage', () => {
  const caseWithValues = (id: string, values: string[]): LegacyCase =>
    legacyCase({
      id,
      observables: values.map((value, index) => ({
        id: `${id}-legacy-${index}`,
        typeKey: 'observable-type-ipv4',
        value,
        description: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: null,
      })),
    });

  it('creates the attachments in chunks without refreshing', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.bulkCreate.mockImplementation(async (objects) => ({
      saved_objects: objects.map(createdResult),
    }));

    const { counts, failedCaseIds } = await migrateObservablesPage({
      repo,
      cases: [
        caseWithValues('case-1', ['10.0.0.1', '10.0.0.2']),
        caseWithValues('case-2', ['10.0.0.3']),
      ],
      bulkCreateSize: 2,
      concurrency: 1,
    });

    expect(repo.bulkCreate).toHaveBeenCalledTimes(2);
    expect(repo.bulkCreate.mock.calls[0][0]).toHaveLength(2);
    expect(repo.bulkCreate.mock.calls[1][0]).toHaveLength(1);
    expect(repo.bulkCreate.mock.calls[0][1]).toEqual({ refresh: false });
    expect(counts).toEqual({
      cases: 2,
      observables: 3,
      created: 3,
      alreadyPresent: 0,
      collapsed: 0,
      failed: 0,
    });
    expect(failedCaseIds).toEqual([]);
  });

  it('counts conflicts as already present and other errors as failures of their case', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.bulkCreate.mockImplementation(async ([first, second, third]) => ({
      saved_objects: [
        createdResult(first),
        errorResult(second, 409, 'conflict'),
        errorResult(third, 400, 'value is too long'),
      ],
    }));

    const { counts, failedCaseIds, failureReasons } = await migrateObservablesPage({
      repo,
      cases: [caseWithValues('case-1', ['10.0.0.1', '10.0.0.2']), caseWithValues('case-2', ['x'])],
    });

    expect(counts).toEqual(expect.objectContaining({ created: 1, alreadyPresent: 1, failed: 1 }));
    expect(failedCaseIds).toEqual(['case-2']);
    expect(failureReasons).toEqual(['value is too long']);
  });

  it('reports invalid observables as failures without writing them', async () => {
    const repo = savedObjectsRepositoryMock.create();

    const { counts, failedCaseIds } = await migrateObservablesPage({
      repo,
      cases: [legacyCase({ observables: [{ id: 'legacy-1' }] })],
    });

    expect(repo.bulkCreate).not.toHaveBeenCalled();
    expect(counts).toEqual(expect.objectContaining({ observables: 1, failed: 1 }));
    expect(failedCaseIds).toEqual(['case-1']);
  });

  it('fails the page when a bulk create request fails', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.bulkCreate.mockRejectedValue(new Error('es unavailable'));

    await expect(migrateObservablesPage({ repo, cases: [legacyCase()] })).rejects.toThrow(
      'es unavailable'
    );
  });
});
