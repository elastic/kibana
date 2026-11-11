/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { similar } from './similar';
import { mockCase } from '../../../public/containers/mock';
import {
  MAX_CASES_BY_OBSERVABLES_CANDIDATES,
  MAX_SIMILAR_OBSERVABLE_CASES,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_HOSTNAME,
} from '../../../common/constants';
import { flattenCaseSavedObject } from '../../common/utils';
import Boom from '@hapi/boom';

const mockClientArgs = createCasesClientMockArgs();
const mockCasesClient = createCasesClientMock();

const mockLicensingService = mockClientArgs.services.licensingService;

describe('similar', () => {
  beforeEach(() => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    jest.mocked(mockClientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [
          {
            id: 'ddfb207d-4b46-4545-bae8-5193c1551e50',
            value: '127.0.0.1',
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            createdAt: '2024-11-07',
            updatedAt: '2024-11-07',
            description: '',
          },
        ],
      },
    });

    mockClientArgs.services.caseService.searchCasesPage.mockResolvedValue({
      cases: [],
      total: 0,
    });
    mockClientArgs.services.observableService.getKeysForCase.mockResolvedValue([]);
    mockClientArgs.services.observableService.findSimilarCandidates.mockResolvedValue({
      candidates: [],
      capped: false,
    });
    // Every source observable is held by one other case, in the field, unless a test says otherwise.
    mockClientArgs.services.caseService.countCasesByObservableKeys.mockImplementation(
      async ({ keys }) => keys.map(() => 1)
    );
    mockClientArgs.services.observableService.countCasesByKeys.mockImplementation(
      async ({ keys }) => keys.map(() => 0)
    );
    mockClientArgs.services.observableService.getSharedForCases.mockResolvedValue(new Map());

    mockClientArgs.services.caseConfigureService.find.mockResolvedValue({
      saved_objects: [],
      page: 1,
      per_page: 10,
      total: 0,
    });

    jest
      .mocked(mockClientArgs.services.attachmentService.getter.getCaseAttatchmentStats)
      .mockResolvedValue(new Map());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const searchQuery = () => mockClientArgs.services.caseService.searchCasesPage.mock.calls[0][0];

  it('matches other cases by one clause per type key and excludes the source case', async () => {
    await similar(mockCase.id, { page: 1, perPage: 10 }, mockClientArgs, mockCasesClient);

    const { query, namespaces } = searchQuery();
    expect(namespaces).toEqual(['default']);
    expect(JSON.stringify(query?.bool?.filter)).toContain(
      `"must_not":[{"term":{"_id":"cases:${mockCase.id}"}}]`
    );
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
                      { terms: { 'cases.observables.value': ['127.0.0.1'] } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ]);
    expect(query?.bool?.minimum_should_match).toBe(1);
    // A raw search reads `cases.owner`, not the find-style `cases.attributes.owner`.
    expect(JSON.stringify(query?.bool?.filter)).toContain('"cases.owner"');
    expect(JSON.stringify(query?.bool?.filter)).not.toContain('cases.attributes.owner');
  });

  it('matches on the source case observables in both stores and on candidates from the type', async () => {
    mockClientArgs.services.observableService.getKeysForCase.mockResolvedValue([
      { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-1' },
    ]);
    mockClientArgs.services.observableService.findSimilarCandidates.mockResolvedValue({
      candidates: [{ caseId: 'candidate-1', sharedCount: 2 }],
      capped: false,
    });

    await similar(mockCase.id, { page: 1, perPage: 10 }, mockClientArgs, mockCasesClient);

    expect(mockClientArgs.services.observableService.findSimilarCandidates).toHaveBeenCalledWith({
      excludeCaseId: mockCase.id,
      keys: [
        { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1' },
        { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-1' },
      ],
      owners: [mockCases[0].attributes.owner],
      size: MAX_CASES_BY_OBSERVABLES_CANDIDATES,
    });
    const { query } = searchQuery();
    expect(query?.bool?.should).toHaveLength(2);
    expect(query?.bool?.should).toContainEqual({ terms: { _id: ['cases:candidate-1'] } });
  });

  it('lists the observables a similar case shares in either store, and how many', async () => {
    const similarCase = {
      ...flattenCaseSavedObject({ savedObject: mockCases[1] }),
      observables: [
        {
          id: 'field-obs',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          value: '127.0.0.1',
          description: null,
          createdAt: '2026-11-06T00:00:00.000Z',
          updatedAt: null,
        },
      ],
    };
    mockClientArgs.services.caseService.searchCasesPage.mockResolvedValue({
      cases: [similarCase],
      total: 1,
    });
    mockClientArgs.services.observableService.getKeysForCase.mockResolvedValue([
      { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-1' },
    ]);
    mockClientArgs.services.observableService.getSharedForCases.mockResolvedValue(
      new Map([
        [
          similarCase.id,
          {
            total: 1,
            observables: [
              {
                id: 'other-type-obs',
                typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
                value: 'host-1',
                description: null,
                createdAt: '2026-11-06T00:00:00.000Z',
                updatedAt: null,
              },
            ],
          },
        ],
      ])
    );

    const res = await similar(
      mockCase.id,
      { page: 1, perPage: 10 },
      mockClientArgs,
      mockCasesClient
    );

    expect(res.total).toBe(1);
    expect(res.cases[0].similarities).toEqual({
      observables: [
        {
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          typeLabel: OBSERVABLE_TYPE_IPV4.label,
          value: '127.0.0.1',
        },
        {
          typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
          typeLabel: OBSERVABLE_TYPE_HOSTNAME.label,
          value: 'host-1',
        },
      ],
      total_observables: 2,
    });
  });

  describe('choosing the source observables to match', () => {
    const hosts = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: `host-${index}`,
      }));

    it('counts the source observables in both stores, leaving out the source case', async () => {
      await similar(mockCase.id, { page: 1, perPage: 10 }, mockClientArgs, mockCasesClient);

      expect(mockClientArgs.services.observableService.countCasesByKeys).toHaveBeenCalledWith({
        keys: [{ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1' }],
        owners: [mockCases[0].attributes.owner],
        excludeCaseId: mockCase.id,
      });
      expect(mockClientArgs.services.caseService.countCasesByObservableKeys).toHaveBeenCalledTimes(
        1
      );
      expect(mockClientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledTimes(1);
    });

    it('skips common observables and those no other case holds, and matches the rarest first', async () => {
      mockClientArgs.services.observableService.getKeysForCase.mockResolvedValue(hosts(3));
      // 127.0.0.1 (field), host-0, host-1, host-2
      mockClientArgs.services.caseService.countCasesByObservableKeys.mockResolvedValue([
        MAX_SIMILAR_OBSERVABLE_CASES + 1,
        0,
        5,
        2,
      ]);

      const res = await similar(
        mockCase.id,
        { page: 1, perPage: 10 },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockClientArgs.services.observableService.findSimilarCandidates).toHaveBeenCalledWith(
        expect.objectContaining({
          keys: [
            { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-2' },
            { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-1' },
          ],
        })
      );
      expect(res.skipped_common_observables).toBe(1);
      // Shared observables are still read for every source observable.
      expect(mockClientArgs.services.observableService.getSharedForCases).toHaveBeenCalledWith(
        expect.objectContaining({
          keys: expect.arrayContaining([{ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1' }]),
        })
      );
    });

    it('adds the counts of both stores before comparing them with the limit', async () => {
      mockClientArgs.services.caseService.countCasesByObservableKeys.mockResolvedValue([
        MAX_SIMILAR_OBSERVABLE_CASES,
      ]);
      mockClientArgs.services.observableService.countCasesByKeys.mockResolvedValue([1]);

      const res = await similar(
        mockCase.id,
        { page: 1, perPage: 10 },
        mockClientArgs,
        mockCasesClient
      );

      expect(res.skipped_common_observables).toBe(1);
      expect(mockClientArgs.services.caseService.searchCasesPage).not.toHaveBeenCalled();
    });

    it('returns no cases without searching when every source observable is common', async () => {
      mockClientArgs.services.caseService.countCasesByObservableKeys.mockResolvedValue([
        MAX_SIMILAR_OBSERVABLE_CASES + 1,
      ]);

      const res = await similar(
        mockCase.id,
        { page: 1, perPage: 10 },
        mockClientArgs,
        mockCasesClient
      );

      expect(res).toEqual({
        cases: [],
        page: 1,
        per_page: 10,
        total: 0,
        total_relation: 'eq',
        skipped_common_observables: 1,
      });
      expect(
        mockClientArgs.services.observableService.findSimilarCandidates
      ).not.toHaveBeenCalled();
      expect(mockClientArgs.services.caseService.searchCasesPage).not.toHaveBeenCalled();
    });
  });

  it('says the total is a minimum when the type side reached the cap', async () => {
    mockClientArgs.services.observableService.findSimilarCandidates.mockResolvedValue({
      candidates: [{ caseId: 'candidate-1', sharedCount: 1 }],
      capped: true,
    });
    mockClientArgs.services.caseService.searchCasesPage.mockResolvedValue({
      cases: [],
      total: 10_000,
    });

    const res = await similar(
      mockCase.id,
      { page: 1, perPage: 0 },
      mockClientArgs,
      mockCasesClient
    );

    expect(res.total).toBe(10_000);
    expect(res.total_relation).toBe('gte');
  });

  it('keeps a value that contains a comma whole', async () => {
    jest.mocked(mockClientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [
          {
            id: 'comma-obs',
            typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
            value: 'a,b',
            description: null,
            createdAt: '2026-11-06T00:00:00.000Z',
            updatedAt: null,
          },
        ],
      },
    });
    mockClientArgs.services.caseService.searchCasesPage.mockResolvedValue({
      cases: [
        {
          ...flattenCaseSavedObject({ savedObject: mockCases[1] }),
          observables: [
            {
              id: 'other-comma-obs',
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              value: 'a,b',
              description: null,
              createdAt: '2026-11-06T00:00:00.000Z',
              updatedAt: null,
            },
          ],
        },
      ],
      total: 1,
    });

    const res = await similar(
      mockCase.id,
      { page: 1, perPage: 10 },
      mockClientArgs,
      mockCasesClient
    );

    expect(res.cases[0].similarities.observables).toEqual([
      expect.objectContaining({ value: 'a,b' }),
    ]);
  });

  describe('attachment totals', () => {
    beforeEach(() => {
      mockClientArgs.services.caseService.searchCasesPage.mockResolvedValue({
        cases: [mockCases[0], mockCases[1]].map((so) =>
          flattenCaseSavedObject({ savedObject: so })
        ),
        total: 2,
      });
    });

    it('should return the attachment totals of each similar case', async () => {
      jest
        .mocked(mockClientArgs.services.attachmentService.getter.getCaseAttatchmentStats)
        .mockResolvedValue(
          new Map([
            [mockCases[0].id, { alerts: 3, userComments: 5, events: 2 }],
            [mockCases[1].id, { alerts: 7, userComments: 1, events: 4 }],
          ])
        );

      const res = await similar(
        mockCase.id,
        { page: 1, perPage: 10 },
        mockClientArgs,
        mockCasesClient
      );

      expect(
        mockClientArgs.services.attachmentService.getter.getCaseAttatchmentStats
      ).toHaveBeenCalledWith({ caseIds: [mockCases[0].id, mockCases[1].id] });
      expect(
        res.cases.map(({ id, totalAlerts, totalComment, totalEvents }) => ({
          id,
          totalAlerts,
          totalComment,
          totalEvents,
        }))
      ).toEqual([
        { id: mockCases[0].id, totalAlerts: 3, totalComment: 5, totalEvents: 2 },
        { id: mockCases[1].id, totalAlerts: 7, totalComment: 1, totalEvents: 4 },
      ]);
    });

    it('should return zero totals for a similar case that has no attachment stats', async () => {
      jest
        .mocked(mockClientArgs.services.attachmentService.getter.getCaseAttatchmentStats)
        .mockResolvedValue(new Map([[mockCases[0].id, { alerts: 3, userComments: 5, events: 2 }]]));

      const res = await similar(
        mockCase.id,
        { page: 1, perPage: 10 },
        mockClientArgs,
        mockCasesClient
      );

      expect(
        res.cases.map(({ id, totalAlerts, totalComment, totalEvents }) => ({
          id,
          totalAlerts,
          totalComment,
          totalEvents,
        }))
      ).toEqual([
        { id: mockCases[0].id, totalAlerts: 3, totalComment: 5, totalEvents: 2 },
        { id: mockCases[1].id, totalAlerts: 0, totalComment: 0, totalEvents: 0 },
      ]);
    });
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      similar(
        mockCase.id,
        {
          page: 1,
          perPage: 10,
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to use the similar cases feature, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should not search cases when the case has no observables in either store', async () => {
    jest.mocked(mockClientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [],
      },
    });

    await similar(
      mockCase.id,
      {
        page: 1,
        perPage: 10,
      },
      mockClientArgs,
      mockCasesClient
    );
    expect(mockClientArgs.services.caseService.searchCasesPage).not.toHaveBeenCalled();
  });

  it('should not search cases when unknown typeKey is specified for an observable', async () => {
    jest.mocked(mockClientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [
          {
            id: '4491eedc-2336-41e3-bf98-29147c133b95',
            typeKey: 'unknown',
            value: 'some value',
            createdAt: '2024-12-16',
            updatedAt: '2024-12-16',
            description: null,
          },
        ],
      },
    });

    await similar(
      mockCase.id,
      {
        page: 1,
        perPage: 10,
      },
      mockClientArgs,
      mockCasesClient
    );
    expect(mockClientArgs.services.caseService.searchCasesPage).not.toHaveBeenCalled();
  });

  it('should forward explicit sort params to the case search', async () => {
    await similar(
      mockCase.id,
      {
        page: 1,
        perPage: 10,
        sortField: 'createdAt',
        sortOrder: 'asc',
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(searchQuery().caseOptions).toEqual(
      expect.objectContaining({ sortField: 'created_at', sortOrder: 'asc', page: 1, perPage: 10 })
    );
  });

  it('should use defaultSortField and leave the order unset when no sort params are provided', async () => {
    await similar(
      mockCase.id,
      {
        page: 1,
        perPage: 10,
      },
      mockClientArgs,
      mockCasesClient
    );

    const { caseOptions } = searchQuery();

    expect(caseOptions).toEqual(expect.objectContaining({ sortField: 'created_at' }));
    expect(caseOptions.sortOrder).toBeUndefined();
  });
});
