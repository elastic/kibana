/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getParentCaseId, getRestrictedCaseIds } from './restricted_cases';

describe('getRestrictedCaseIds', () => {
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only the ids of restricted cases', async () => {
    soClient.bulkGet.mockResolvedValue({
      saved_objects: [
        { id: 'restricted-1', attributes: { access: { mode: 'restricted' } } },
        { id: 'default-1', attributes: { access: { mode: 'default' } } },
        { id: 'no-field-1', attributes: {} },
      ] as never,
    });

    const result = await getRestrictedCaseIds(soClient, [
      { caseId: 'restricted-1' },
      { caseId: 'default-1' },
      { caseId: 'no-field-1' },
    ]);

    expect(result).toEqual(new Set(['restricted-1']));
  });

  it('treats a case that cannot be fetched as restricted (fails closed)', async () => {
    soClient.bulkGet.mockResolvedValue({
      saved_objects: [
        { id: 'gone-1', error: { statusCode: 404, error: 'Not Found', message: 'not found' } },
      ] as never,
    });

    const result = await getRestrictedCaseIds(soClient, [{ caseId: 'gone-1' }]);

    expect(result).toEqual(new Set(['gone-1']));
  });

  it('does not call the saved objects client without case ids', async () => {
    const result = await getRestrictedCaseIds(soClient, []);

    expect(result).toEqual(new Set());
    expect(soClient.bulkGet).not.toHaveBeenCalled();
  });

  it('passes the concrete namespace per object and dedupes requests', async () => {
    soClient.bulkGet.mockResolvedValue({ saved_objects: [] as never });

    await getRestrictedCaseIds(soClient, [
      { caseId: 'case-1', namespace: 'space-a' },
      { caseId: 'case-1', namespace: 'space-a' },
      { caseId: 'case-2' },
    ]);

    expect(soClient.bulkGet).toHaveBeenCalledWith([
      { type: 'cases', id: 'case-1', fields: ['access'], namespaces: ['space-a'] },
      { type: 'cases', id: 'case-2', fields: ['access'] },
    ]);
  });
});

describe('getParentCaseId', () => {
  it('extracts the case id from the cases reference', () => {
    expect(
      getParentCaseId({
        references: [
          { id: 'other', type: 'action', name: 'connectorId' },
          { id: 'case-1', type: 'cases', name: 'associated-cases' },
        ],
      })
    ).toBe('case-1');
  });

  it('returns undefined when there is no cases reference', () => {
    expect(getParentCaseId({ references: [] })).toBeUndefined();
  });
});
