/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { countByObservables, findByObservable } from './find_by_observable';
import {
  MAX_CASES_BY_OBSERVABLES_CANDIDATES,
  OBSERVABLE_TYPE_IPV4,
} from '../../../common/constants';
import { flattenCaseSavedObject } from '../../common/utils';

const mockClientArgs = createCasesClientMockArgs();
const {
  services: { caseService, observableService, licensingService, attachmentService },
} = mockClientArgs;

const request = {
  owner: 'securitySolution',
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value: '10.0.0.8',
};

describe('findByObservable', () => {
  beforeEach(() => {
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    caseService.searchCasesPage.mockResolvedValue({ cases: [], total: 0 });
    observableService.findSimilarCandidates.mockResolvedValue({ candidates: [], capped: false });
    observableService.getPreviews.mockResolvedValue(new Map());
    jest.mocked(attachmentService.getter.getCaseAttatchmentStats).mockResolvedValue(new Map());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const searchArgs = () => caseService.searchCasesPage.mock.calls[0][0];

  it('matches the exact type key and value in the case field and in the type', async () => {
    observableService.findSimilarCandidates.mockResolvedValue({
      candidates: [{ caseId: 'case-in-type', sharedCount: 1 }],
      capped: false,
    });

    await findByObservable(request, mockClientArgs);

    expect(observableService.findSimilarCandidates).toHaveBeenCalledWith({
      excludeCaseId: undefined,
      keys: [{ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.8' }],
      owners: ['securitySolution'],
      size: MAX_CASES_BY_OBSERVABLES_CANDIDATES,
    });

    const { query, namespaces } = searchArgs();
    expect(namespaces).toEqual(['default']);
    expect(JSON.stringify(query?.bool?.filter)).not.toContain('must_not');
    expect(query?.bool?.should).toEqual([
      {
        nested: {
          path: 'cases.observables',
          query: {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      { term: { 'cases.observables.typeKey': OBSERVABLE_TYPE_IPV4.key } },
                      { terms: { 'cases.observables.value': ['10.0.0.8'] } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
      { terms: { _id: ['cases:case-in-type'] } },
    ]);
    expect(query?.bool?.minimum_should_match).toBe(1);
    expect(JSON.stringify(query?.bool?.filter)).toContain('"cases.owner"');
    expect(JSON.stringify(query?.bool?.filter)).not.toContain('cases.attributes.owner');
  });

  it('leaves out the excluded case in both stores', async () => {
    await findByObservable({ ...request, excludeCaseId: 'source-case' }, mockClientArgs);

    expect(observableService.findSimilarCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ excludeCaseId: 'source-case' })
    );
    expect(JSON.stringify(searchArgs().query?.bool?.filter)).toContain(
      '"must_not":[{"term":{"_id":"cases:source-case"}}]'
    );
  });

  it('says the total is a minimum when the type side reached the cap', async () => {
    observableService.findSimilarCandidates.mockResolvedValue({
      candidates: [{ caseId: 'case-in-type', sharedCount: 1 }],
      capped: true,
    });
    caseService.searchCasesPage.mockResolvedValue({ cases: [], total: 10_000 });

    const res = await findByObservable({ ...request, perPage: 0 }, mockClientArgs);

    expect(res.total).toBe(10_000);
    expect(res.total_relation).toBe('gte');
  });

  it('searches nothing when the user cannot read the owner', async () => {
    jest.mocked(mockClientArgs.authorization.getAuthorizationFilter).mockResolvedValueOnce({
      filter: undefined,
      ensureSavedObjectsAreAuthorized: jest.fn(),
      authorizedOwners: ['cases'],
    });

    const res = await findByObservable(request, mockClientArgs);

    expect(res.total).toBe(0);
    expect(observableService.findSimilarCandidates).not.toHaveBeenCalled();
    expect(caseService.searchCasesPage).not.toHaveBeenCalled();
  });

  it('sorts by created date, newest first, by default', async () => {
    await findByObservable(request, mockClientArgs);

    expect(searchArgs().caseOptions).toEqual({
      sortField: 'created_at',
      sortOrder: 'desc',
      page: 1,
      perPage: 20,
    });
  });

  it('forwards paging and sorting', async () => {
    await findByObservable(
      { ...request, page: 3, perPage: 50, sortField: 'updatedAt', sortOrder: 'asc' },
      mockClientArgs
    );

    expect(searchArgs().caseOptions).toEqual({
      sortField: 'updated_at',
      sortOrder: 'asc',
      page: 3,
      perPage: 50,
    });
  });

  it('returns only the total for perPage 0', async () => {
    caseService.searchCasesPage.mockResolvedValue({ cases: [], total: 12 });

    const res = await findByObservable({ ...request, perPage: 0 }, mockClientArgs);

    expect(searchArgs().caseOptions.perPage).toBe(0);
    expect(res).toEqual({ cases: [], page: 1, per_page: 0, total: 12, total_relation: 'eq' });
  });

  it('returns the cases with their attachment totals', async () => {
    const theCase = flattenCaseSavedObject({ savedObject: mockCases[1] });
    caseService.searchCasesPage.mockResolvedValue({ cases: [theCase], total: 1 });
    jest
      .mocked(attachmentService.getter.getCaseAttatchmentStats)
      .mockResolvedValue(new Map([[theCase.id, { userComments: 2, alerts: 3, events: 1 }]]));

    const res = await findByObservable(request, mockClientArgs);

    expect(res.total).toBe(1);
    expect(res.cases).toHaveLength(1);
    expect(res.cases[0]).toEqual(
      expect.objectContaining({
        id: theCase.id,
        totalComment: 2,
        totalAlerts: 3,
        totalEvents: 1,
      })
    );
  });

  it('checks that the user can read every returned case', async () => {
    const theCase = flattenCaseSavedObject({ savedObject: mockCases[1] });
    caseService.searchCasesPage.mockResolvedValue({ cases: [theCase], total: 1 });
    const ensureSavedObjectsAreAuthorized = jest.fn();
    jest.mocked(mockClientArgs.authorization.getAuthorizationFilter).mockResolvedValue({
      filter: undefined,
      ensureSavedObjectsAreAuthorized,
    });

    await findByObservable(request, mockClientArgs);

    expect(ensureSavedObjectsAreAuthorized).toHaveBeenCalledWith([
      { id: theCase.id, owner: theCase.owner },
    ]);
  });

  it('throws without a platinum license', async () => {
    licensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(findByObservable(request, mockClientArgs)).rejects.toThrow(
      'In order to find cases by observable, you must be subscribed to an Elastic Platinum license'
    );
    expect(caseService.searchCasesPage).not.toHaveBeenCalled();
  });

  it('rejects a value longer than the bound', async () => {
    await expect(
      findByObservable({ ...request, value: 'a'.repeat(1025) }, mockClientArgs)
    ).rejects.toThrow();
    expect(caseService.searchCasesPage).not.toHaveBeenCalled();
  });

  it('rejects more than 100 cases per page', async () => {
    await expect(findByObservable({ ...request, perPage: 101 }, mockClientArgs)).rejects.toThrow(
      'The maximum allowed perPage value is 100'
    );
  });

  it('rejects unknown fields', async () => {
    await expect(
      findByObservable({ ...request, foo: 'bar' } as typeof request, mockClientArgs)
    ).rejects.toThrow();
  });
});

describe('countByObservables', () => {
  const owner = 'securitySolution';
  const ipv4 = (value: string) => ({ typeKey: OBSERVABLE_TYPE_IPV4.key, value });

  beforeEach(() => {
    licensingService.isAtLeastPlatinum.mockResolvedValue(true);
    caseService.countCasesByObservableKeys.mockImplementation(async ({ keys }) =>
      keys.map(() => 0)
    );
    observableService.countCasesByKeys.mockImplementation(async ({ keys }) => keys.map(() => 0));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the counts of both stores for each observable, in two searches', async () => {
    caseService.countCasesByObservableKeys.mockResolvedValue([1, 0]);
    observableService.countCasesByKeys.mockResolvedValue([3, 0]);

    const res = await countByObservables(
      { owner, observables: [ipv4('10.0.0.8'), ipv4('10.0.0.9')], excludeCaseId: 'source-case' },
      mockClientArgs
    );

    expect(res).toEqual({
      counts: [
        { ...ipv4('10.0.0.8'), total: 4 },
        { ...ipv4('10.0.0.9'), total: 0 },
      ],
    });
    expect(caseService.countCasesByObservableKeys).toHaveBeenCalledTimes(1);
    expect(observableService.countCasesByKeys).toHaveBeenCalledWith({
      keys: [ipv4('10.0.0.8'), ipv4('10.0.0.9')],
      owners: [owner],
      excludeCaseId: 'source-case',
    });
    expect(caseService.searchCasesPage).not.toHaveBeenCalled();
    expect(observableService.findSimilarCandidates).not.toHaveBeenCalled();
  });

  it('counts the field side over the owner, leaving out the excluded case', async () => {
    await countByObservables(
      { owner, observables: [ipv4('10.0.0.8')], excludeCaseId: 'source-case' },
      mockClientArgs
    );

    const [[{ query, keys, namespaces }]] = caseService.countCasesByObservableKeys.mock.calls;
    expect(keys).toEqual([ipv4('10.0.0.8')]);
    expect(namespaces).toEqual(['default']);
    expect(query?.bool?.must_not).toEqual([{ term: { _id: 'cases:source-case' } }]);
    expect(JSON.stringify(query?.bool?.filter)).toContain('"cases.owner"');
  });

  it('checks the authorization once for all the counts', async () => {
    await countByObservables(
      { owner, observables: [ipv4('10.0.0.8'), ipv4('10.0.0.9'), ipv4('10.0.0.10')] },
      mockClientArgs
    );

    expect(mockClientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledTimes(1);
  });

  it('returns zeros without searching when the user cannot read the owner', async () => {
    jest.mocked(mockClientArgs.authorization.getAuthorizationFilter).mockResolvedValueOnce({
      filter: undefined,
      ensureSavedObjectsAreAuthorized: jest.fn(),
      authorizedOwners: ['cases'],
    });

    const res = await countByObservables(
      { owner, observables: [ipv4('10.0.0.8')] },
      mockClientArgs
    );

    expect(res.counts).toEqual([{ ...ipv4('10.0.0.8'), total: 0 }]);
    expect(caseService.countCasesByObservableKeys).not.toHaveBeenCalled();
    expect(observableService.countCasesByKeys).not.toHaveBeenCalled();
  });

  it('counts a repeated observable once', async () => {
    const res = await countByObservables(
      { owner, observables: [ipv4('10.0.0.8'), ipv4('10.0.0.8')] },
      mockClientArgs
    );

    expect(res.counts).toHaveLength(1);
    expect(observableService.countCasesByKeys).toHaveBeenCalledWith(
      expect.objectContaining({ keys: [ipv4('10.0.0.8')] })
    );
  });

  it('throws without a platinum license', async () => {
    licensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      countByObservables({ owner, observables: [ipv4('10.0.0.8')] }, mockClientArgs)
    ).rejects.toThrow('Elastic Platinum license');
  });

  it('rejects more than 100 observables', async () => {
    await expect(
      countByObservables(
        {
          owner,
          observables: Array.from({ length: 101 }, (_, index) => ipv4(`10.0.0.${index}`)),
        },
        mockClientArgs
      )
    ).rejects.toThrow();
    expect(observableService.countCasesByKeys).not.toHaveBeenCalled();
  });
});
