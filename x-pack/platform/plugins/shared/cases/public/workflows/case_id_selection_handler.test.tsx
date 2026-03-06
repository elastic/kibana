/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortFieldCase } from '../../common/ui';
import { getCases, resolveCase } from '../containers/api';
import { DEFAULT_FILTER_OPTIONS } from '../containers/constants';
import { caseIdSelection } from './case_id_selection_handler';

jest.mock('../containers/api', () => ({
  getCases: jest.fn(),
  resolveCase: jest.fn(),
}));

describe('caseIdSelection', () => {
  const getCasesMock = jest.mocked(getCases);
  const resolveCaseMock = jest.mocked(resolveCase);

  afterEach(() => {
    getCasesMock.mockReset();
    resolveCaseMock.mockReset();
  });

  it('searches cases by title and maps results to options', async () => {
    getCasesMock.mockResolvedValue({
      cases: [
        {
          id: 'case-1',
          title: 'Suspicious login detected',
          description: 'Investigate unusual login activity',
        },
      ],
      page: 1,
      perPage: 20,
      total: 1,
      countOpenCases: 1,
      countInProgressCases: 0,
      countClosedCases: 0,
    } as Awaited<ReturnType<typeof getCases>>);

    await caseIdSelection.search('suspicious');

    expect(getCasesMock).toHaveBeenCalledWith({
      filterOptions: {
        ...DEFAULT_FILTER_OPTIONS,
        search: 'suspicious',
        searchFields: ['title'],
      },
      queryParams: {
        page: 1,
        perPage: 10,
        sortField: SortFieldCase.updatedAt,
        sortOrder: 'desc',
      },
    });
  });

  it('returns no options for an empty query', async () => {
    await expect(caseIdSelection.search('   ')).resolves.toEqual([]);
    expect(getCasesMock).not.toHaveBeenCalled();
  });

  it('resolves a case by id', async () => {
    resolveCaseMock.mockResolvedValue({
      case: {
        id: 'case-1',
        title: 'Suspicious login detected',
        description: 'Investigate unusual login activity',
      },
      outcome: 'exactMatch',
    } as Awaited<ReturnType<typeof resolveCase>>);

    await caseIdSelection.resolve('case-1');

    expect(resolveCaseMock).toHaveBeenCalledWith({ caseId: 'case-1' });
  });

  it('returns null when resolving an unknown case id', async () => {
    resolveCaseMock.mockRejectedValue(new Error('not found'));

    await expect(caseIdSelection.resolve('missing-case-id')).resolves.toBeNull();
  });

  it('returns details messages for resolved and unresolved values', async () => {
    const resolvedDetails = await caseIdSelection.getDetails(
      'case-1',
      { stepType: 'cases.updateCase', scope: 'input', propertyKey: 'case_id' },
      { value: 'case-1', label: 'Suspicious login detected', description: 'Investigate' }
    );
    const unresolvedDetails = await caseIdSelection.getDetails(
      'missing-case-id',
      { stepType: 'cases.updateCase', scope: 'input', propertyKey: 'case_id' },
      null
    );

    expect(resolvedDetails.message).toContain('can be used');
    expect(unresolvedDetails.message).toContain('was not found');
  });
});
