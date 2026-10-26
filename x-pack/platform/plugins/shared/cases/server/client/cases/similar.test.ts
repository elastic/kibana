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
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';
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

    mockClientArgs.services.caseService.findCases.mockResolvedValue({
      page: 1,
      per_page: 10,
      total: mockCases.length,
      saved_objects: [],
    });

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

  it('should execute query with observable type key and value and proper filters', async () => {
    await similar(
      mockCase.id,
      {
        page: 1,
        perPage: 10,
      },
      mockClientArgs,
      mockCasesClient
    );
    expect(mockClientArgs.services.caseService.findCases).toHaveBeenCalled();

    const call = mockClientArgs.services.caseService.findCases.mock.calls[0][0];

    expect(call).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.observables",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "value",
                          },
                          Object {
                            "isQuoted": true,
                            "type": "literal",
                            "value": "127.0.0.1",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "typeKey",
                          },
                          Object {
                            "isQuoted": true,
                            "type": "literal",
                            "value": "observable-type-ipv4",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                    ],
                    "function": "and",
                    "type": "function",
                  },
                ],
                "function": "nested",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "securitySolution",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "and",
            "type": "function",
          },
          "page": 1,
          "perPage": 10,
          "rootSearchFields": Array [
            "_id",
          ],
          "search": "-\\"cases:mock-id\\"",
          "sortField": "created_at",
          "sortOrder": undefined,
        }
      `);
  });

  describe('attachment totals', () => {
    const similarSavedObjects = [mockCases[0], mockCases[1]].map((so) => ({ ...so, score: 0 }));

    beforeEach(() => {
      mockClientArgs.services.caseService.findCases.mockResolvedValue({
        page: 1,
        per_page: 10,
        total: similarSavedObjects.length,
        saved_objects: similarSavedObjects,
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
      ).toHaveBeenCalledTimes(1);
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

  it('should not call findCases when the case has no observables', async () => {
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
    expect(mockClientArgs.services.caseService.findCases).not.toHaveBeenCalled();
  });

  it('should not call findCases when unknown typeKey is specified for an observable', async () => {
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
          {
            id: 'e7d3f99d-c8be-41df-ada0-640021571bd4',
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
    expect(mockClientArgs.services.caseService.findCases).not.toHaveBeenCalled();
  });

  it('should forward explicit sort params to caseService.findCases', async () => {
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

    expect(mockClientArgs.services.caseService.findCases).toHaveBeenCalledWith(
      expect.objectContaining({ sortField: 'created_at', sortOrder: 'asc' })
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

    const findCasesArgs = mockClientArgs.services.caseService.findCases.mock.calls[0][0];

    expect(findCasesArgs).toEqual(expect.objectContaining({ sortField: 'created_at' }));
    expect(findCasesArgs?.sortOrder).toBeUndefined();
  });
});
