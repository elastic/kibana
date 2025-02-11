/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import Boom from '@hapi/boom';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
} from '../../../common/constants';
import type { CasePostRequest } from '../../../common';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { bulkCreate } from './bulk_create';
import { CaseSeverity, ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';

import type { CaseCustomFields } from '../../../common/types/domain';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');

  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

describe('bulkCreate', () => {
  const getCases = (overrides = {}) => [
    {
      title: 'My Case',
      tags: [],
      description: 'testing sir',
      connector: {
        id: '.none',
        name: 'None',
        type: ConnectorTypes.none,
        fields: null,
      },
      settings: { syncAlerts: true },
      severity: CaseSeverity.LOW,
      owner: SECURITY_SOLUTION_OWNER,
      assignees: [{ uid: '1' }],
      ...overrides,
    },
  ];

  const caseSO = mockCases[0];
  const casesClientMock = createCasesClientMock();
  casesClientMock.configure.get = jest.fn().mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execution', () => {
    const createdAtDate = new Date('2023-11-05');

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(createdAtDate);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    const clientArgs = createCasesClientMockArgs();

    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
      saved_objects: [caseSO],
    });

    it('create the cases correctly', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          { ...caseSO, attributes: { ...caseSO.attributes, severity: CaseSeverity.CRITICAL } },
        ],
      });

      const res = await bulkCreate(
        { cases: [getCases()[0], getCases({ severity: CaseSeverity.CRITICAL })[0]] },
        clientArgs,
        casesClientMock
      );

      expect(res).toMatchInlineSnapshot(`
        Object {
          "cases": Array [
            Object {
              "assignees": Array [],
              "category": null,
              "closed_at": null,
              "closed_by": null,
              "comments": Array [],
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
              "created_at": "2019-11-25T21:54:48.952Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "customFields": Array [],
              "description": "This is a brand new case of a bad meanie defacing data",
              "duration": null,
              "external_service": null,
              "id": "mock-id-1",
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "severity": "low",
              "status": "open",
              "tags": Array [
                "defacement",
              ],
              "title": "Super Bad Security Issue",
              "totalAlerts": 0,
              "totalComment": 0,
              "updated_at": "2019-11-25T21:54:48.952Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzAsMV0=",
            },
            Object {
              "assignees": Array [],
              "category": null,
              "closed_at": null,
              "closed_by": null,
              "comments": Array [],
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
              "created_at": "2019-11-25T21:54:48.952Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "customFields": Array [],
              "description": "This is a brand new case of a bad meanie defacing data",
              "duration": null,
              "external_service": null,
              "id": "mock-id-1",
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "severity": "critical",
              "status": "open",
              "tags": Array [
                "defacement",
              ],
              "title": "Super Bad Security Issue",
              "totalAlerts": 0,
              "totalComment": 0,
              "updated_at": "2019-11-25T21:54:48.952Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzAsMV0=",
            },
          ],
        }
      `);
    });

    it('accepts an ID in the request correctly', async () => {
      await bulkCreate({ cases: getCases({ id: 'my-id' }) }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].id).toBe(
        'my-id'
      );
    });

    it('generates an ID if not provided in the request', async () => {
      await bulkCreate({ cases: getCases() }, clientArgs, casesClientMock);

      expect(clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].id).toBe(
        'mock-saved-object-id'
      );
    });

    it('calls bulkCreateCases correctly', async () => {
      await bulkCreate(
        { cases: [getCases()[0], getCases({ severity: CaseSeverity.CRITICAL })[0]] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        Object {
          "cases": Array [
            Object {
              "assignees": Array [
                Object {
                  "uid": "1",
                },
              ],
              "category": null,
              "closed_at": null,
              "closed_by": null,
              "connector": Object {
                "fields": null,
                "id": ".none",
                "name": "None",
                "type": ".none",
              },
              "created_at": "2023-11-05T00:00:00.000Z",
              "created_by": Object {
                "email": "damaged_raccoon@elastic.co",
                "full_name": "Damaged Raccoon",
                "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                "username": "damaged_raccoon",
              },
              "customFields": Array [],
              "description": "testing sir",
              "duration": null,
              "external_service": null,
              "id": "mock-saved-object-id",
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "severity": "low",
              "status": "open",
              "tags": Array [],
              "title": "My Case",
              "updated_at": null,
              "updated_by": null,
            },
            Object {
              "assignees": Array [
                Object {
                  "uid": "1",
                },
              ],
              "category": null,
              "closed_at": null,
              "closed_by": null,
              "connector": Object {
                "fields": null,
                "id": ".none",
                "name": "None",
                "type": ".none",
              },
              "created_at": "2023-11-05T00:00:00.000Z",
              "created_by": Object {
                "email": "damaged_raccoon@elastic.co",
                "full_name": "Damaged Raccoon",
                "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                "username": "damaged_raccoon",
              },
              "customFields": Array [],
              "description": "testing sir",
              "duration": null,
              "external_service": null,
              "id": "mock-saved-object-id",
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "severity": "critical",
              "status": "open",
              "tags": Array [],
              "title": "My Case",
              "updated_at": null,
              "updated_by": null,
            },
          ],
          "refresh": false,
        }
      `);
    });

    it('throws an error if bulkCreateCases returns at least one error ', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '2',
            type: 'cases',
            error: {
              error: 'My error',
              message: 'not found',
              statusCode: 404,
            },
            references: [],
          },
          {
            id: '3',
            type: 'cases',
            error: {
              error: 'My second error',
              message: 'conflict',
              statusCode: 409,
            },
            references: [],
          },
        ],
      });

      await expect(bulkCreate({ cases: getCases() }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to bulk create cases: Error: My error`
      );
    });

    it('constructs the case error correctly', async () => {
      expect.assertions(1);

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            error: {
              error: 'My error',
              message: 'not found',
              statusCode: 404,
            },
            references: [],
          },
        ],
      });

      try {
        await bulkCreate({ cases: getCases() }, clientArgs, casesClientMock);
      } catch (error) {
        expect(error.wrappedError.output).toEqual({
          headers: {},
          payload: { error: 'Not Found', message: 'My error', statusCode: 404 },
          statusCode: 404,
        });
      }
    });

    it('constructs the case error correctly in case of an SO decorated error', async () => {
      expect.assertions(1);

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            // @ts-expect-error: the error property of the SO client is not typed correctly
            error: {
              ...Boom.boomify(new Error('My error'), {
                statusCode: 404,
                message: 'SO not found',
              }),
            },
            references: [],
          },
        ],
      });

      try {
        await bulkCreate({ cases: getCases() }, clientArgs, casesClientMock);
      } catch (error) {
        expect(error.wrappedError.output).toEqual({
          headers: {},
          payload: { error: 'Not Found', message: 'Not Found', statusCode: 404 },
          statusCode: 404,
        });
      }
    });
  });

  describe('authorization', () => {
    const clientArgs = createCasesClientMockArgs();

    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
      saved_objects: [caseSO],
    });

    it('validates the cases correctly', async () => {
      await bulkCreate(
        { cases: [getCases()[0], getCases({ owner: 'cases' })[0]] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-saved-object-id', owner: 'securitySolution' },
          { id: 'mock-saved-object-id', owner: 'cases' },
        ],
        operation: [
          {
            action: 'cases_assign',
            docType: 'case',
            ecsType: 'change',
            name: 'assignCase',
            savedObjectType: 'cases',
            verbs: { past: 'updated', present: 'update', progressive: 'updating' },
          },
          {
            action: 'case_create',
            docType: 'case',
            ecsType: 'creation',
            name: 'createCase',
            savedObjectType: 'cases',
            verbs: { past: 'created', present: 'create', progressive: 'creating' },
          },
        ],
      });
    });

    it('validates with assign+create operations when cases have assignees', async () => {
      await bulkCreate(
        { cases: [getCases()[0], getCases({ owner: 'cases' })[0]] },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [
          { id: 'mock-saved-object-id', owner: 'securitySolution' },
          { id: 'mock-saved-object-id', owner: 'cases' },
        ],
        operation: [
          {
            action: 'cases_assign',
            docType: 'case',
            ecsType: 'change',
            name: 'assignCase',
            savedObjectType: 'cases',
            verbs: { past: 'updated', present: 'update', progressive: 'updating' },
          },
          {
            action: 'case_create',
            docType: 'case',
            ecsType: 'creation',
            name: 'createCase',
            savedObjectType: 'cases',
            verbs: { past: 'created', present: 'create', progressive: 'creating' },
          },
        ],
      });
    });

    it('validates with only create operation when cases have no assignees', async () => {
      await bulkCreate({ cases: [getCases({ assignees: [] })[0]] }, clientArgs, casesClientMock);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        entities: [{ id: 'mock-saved-object-id', owner: 'securitySolution' }],
        operation: {
          action: 'case_create',
          docType: 'case',
          ecsType: 'creation',
          name: 'createCase',
          savedObjectType: 'cases',
          verbs: { past: 'created', present: 'create', progressive: 'creating' },
        },
      });
    });
  });

  describe('Assignees', () => {
    const clientArgs = createCasesClientMockArgs();

    it('notifies single assignees', async () => {
      const caseSOWithAssignees = {
        ...caseSO,
        attributes: { ...caseSO.attributes, assignees: [{ uid: '1' }] },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithAssignees],
      });

      const cases = getCases();

      await bulkCreate({ cases }, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: cases[0].assignees,
          theCase: caseSOWithAssignees,
        },
      ]);
    });

    it('notifies multiple assignees', async () => {
      const caseSOWithAssignees = {
        ...caseSO,
        attributes: { ...caseSO.attributes, assignees: [{ uid: '1' }, { uid: '2' }] },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithAssignees],
      });

      await bulkCreate(
        { cases: getCases({ assignees: [{ uid: '1' }, { uid: '2' }] }) },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: [{ uid: '1' }, { uid: '2' }],
          theCase: caseSOWithAssignees,
        },
      ]);
    });

    it('does not notify when there are no assignees', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate({ cases: getCases({ assignees: [] }) }, clientArgs, casesClientMock);

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).not.toHaveBeenCalled();
    });

    it('does not notify the current user', async () => {
      const caseSOWithAssignees = {
        ...caseSO,
        attributes: {
          ...caseSO.attributes,
          assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
        },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithAssignees],
      });

      await bulkCreate(
        {
          cases: getCases({
            assignees: [{ uid: '1' }, { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
          }),
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.services.notificationService.bulkNotifyAssignees).toHaveBeenCalledWith([
        {
          assignees: [{ uid: '1' }],
          theCase: caseSOWithAssignees,
        },
      ]);
    });

    it('should throw an error if the assignees array length is too long', async () => {
      const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foo' });

      await expect(
        bulkCreate({ cases: getCases({ assignees }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_PER_CASE}.`
      );
    });

    it('should throw if the user does not have the correct license', async () => {
      clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);

      await expect(bulkCreate({ cases: getCases() }, clientArgs, casesClientMock)).rejects.toThrow(
        `Failed to bulk create cases: Error: In order to assign users to cases, you must be subscribed to an Elastic Platinum license`
      );
    });
  });

  describe('Attributes', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    it('should throw an error when an excess field exists', async () => {
      await expect(
        bulkCreate({ cases: getCases({ foo: 'bar' }) }, clientArgs, casesClientMock)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('title', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    it(`should not throw an error if the title is non empty and less than ${MAX_TITLE_LENGTH} characters`, async () => {
      await expect(
        bulkCreate(
          { cases: getCases({ title: 'This is a test case!!' }) },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('should throw an error if the title length is too long', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({
              title:
                'This is a very long title with more than one hundred and sixty characters!! To confirm the maximum limit error thrown for more than one hundred and sixty characters!!',
            }),
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
      );
    });

    it('should throw an error if the title is an empty string', async () => {
      await expect(
        bulkCreate({ cases: getCases({ title: '' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The title field cannot be an empty string.'
      );
    });

    it('should throw an error if the title is a string with empty characters', async () => {
      await expect(
        bulkCreate({ cases: getCases({ title: '   ' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The title field cannot be an empty string.'
      );
    });

    it('should trim title', async () => {
      await bulkCreate(
        { cases: getCases({ title: 'title with spaces      ' }) },
        clientArgs,
        casesClientMock
      );

      const title = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].title;

      expect(title).toBe('title with spaces');
    });
  });

  describe('description', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    it(`should not throw an error if the description is non empty and less than ${MAX_DESCRIPTION_LENGTH} characters`, async () => {
      await expect(
        bulkCreate(
          { cases: getCases({ description: 'This is a test description!!' }) },
          clientArgs,
          casesClientMock
        )
      ).resolves.not.toThrow();
    });

    it('should throw an error if the description length is too long', async () => {
      const description = Array(MAX_DESCRIPTION_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate({ cases: getCases({ description }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
      );
    });

    it('should throw an error if the description is an empty string', async () => {
      await expect(
        bulkCreate({ cases: getCases({ description: '' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The description field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate({ cases: getCases({ description: '   ' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The description field cannot be an empty string.'
      );
    });

    it('should trim description', async () => {
      await bulkCreate(
        { cases: getCases({ description: 'this is a description with spaces!!      ' }) },
        clientArgs,
        casesClientMock
      );

      const description =
        clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].description;

      expect(description).toBe('this is a description with spaces!!');
    });
  });

  describe('tags', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    it('should not throw an error if the tags array is empty', async () => {
      await expect(
        bulkCreate({ cases: getCases({ tags: [] }) }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should not throw an error if the tags array has non empty string within limit', async () => {
      await expect(
        bulkCreate({ cases: getCases({ tags: ['abc'] }) }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the tags array length is too long', async () => {
      const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foo');

      await expect(
        bulkCreate({ cases: getCases({ tags }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
      );
    });

    it('should throw an error if the tags array has empty string', async () => {
      await expect(
        bulkCreate({ cases: getCases({ tags: [''] }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tags array has string with empty characters', async () => {
      await expect(
        bulkCreate({ cases: getCases({ tags: ['  '] }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The tag field cannot be an empty string.'
      );
    });

    it('should throw an error if the tag length is too long', async () => {
      const tag = Array(MAX_LENGTH_PER_TAG + 1)
        .fill('f')
        .toString();

      await expect(
        bulkCreate({ cases: getCases({ tags: [tag] }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
      );
    });

    it('should trim tags', async () => {
      await bulkCreate(
        { cases: getCases({ tags: ['pepsi     ', 'coke'] }) },
        clientArgs,
        casesClientMock
      );

      const tags = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].tags;

      expect(tags).toEqual(['pepsi', 'coke']);
    });
  });

  describe('Category', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    it('should not throw an error if the category is null', async () => {
      await expect(
        bulkCreate({ cases: getCases({ category: null }) }, clientArgs, casesClientMock)
      ).resolves.not.toThrow();
    });

    it('should throw an error if the category length is too long', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({ category: 'A very long category with more than fifty characters!' }),
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The length of the category is too long.'
      );
    });

    it('should throw an error if the category is an empty string', async () => {
      await expect(
        bulkCreate({ cases: getCases({ category: '' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The category field cannot be an empty string.,Invalid value "" supplied to "cases,category"'
      );
    });

    it('should throw an error if the category is a string with empty characters', async () => {
      await expect(
        bulkCreate({ cases: getCases({ category: '   ' }) }, clientArgs, casesClientMock)
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: The category field cannot be an empty string.,Invalid value "   " supplied to "cases,category"'
      );
    });

    it('should trim category', async () => {
      await bulkCreate(
        { cases: getCases({ category: 'reporting       ' }) },
        clientArgs,
        casesClientMock
      );

      const category =
        clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].category;

      expect(category).toEqual('reporting');
    });
  });

  describe('Custom Fields', () => {
    const clientArgs = createCasesClientMockArgs();
    const theCase = getCases()[0];
    const casesClient = createCasesClientMock();
    const defaultCustomFieldsConfiguration = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        label: 'label 1',
        required: true,
        defaultValue: 'default value',
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'label 2',
        required: false,
      },
    ];

    const theCustomFields: CaseCustomFields = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        value: 'this is a text field value',
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        value: true,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: defaultCustomFieldsConfiguration,
        },
      ]);
    });

    it('should bulkCreate customFields correctly', async () => {
      await expect(
        bulkCreate({ cases: getCases({ customFields: theCustomFields }) }, clientArgs, casesClient)
      ).resolves.not.toThrow();

      const customFields =
        clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].customFields;

      expect(customFields).toEqual(theCustomFields);
    });

    it('fills out missing required custom fields', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            defaultCustomFieldsConfiguration[0],
            {
              ...defaultCustomFieldsConfiguration[1],
              required: true,
              defaultValue: true,
            },
          ],
        },
      ]);

      await expect(
        bulkCreate({ cases: getCases() }, clientArgs, casesClient)
      ).resolves.not.toThrow();

      const customFields =
        clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0].customFields;

      expect(customFields).toEqual([
        { key: 'first_key', type: 'text', value: 'default value' },
        { key: 'second_key', type: 'toggle', value: true },
      ]);
    });

    it('throws error when required customFields are null', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              ...defaultCustomFieldsConfiguration[0],
              label: 'missing field 1',
            },
            {
              ...defaultCustomFieldsConfiguration[1],
              label: 'missing field 2',
              required: true,
              defaultValue: true,
            },
          ],
        },
      ]);

      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [
                {
                  key: 'first_key',
                  type: CustomFieldTypes.TEXT,
                  value: null,
                },
                {
                  key: 'second_key',
                  type: CustomFieldTypes.TOGGLE,
                  value: null,
                },
              ],
            }),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: Invalid value \\"null\\" supplied for the following required custom fields: \\"missing field 1\\", \\"missing field 2\\""`
      );
    });

    it('throws error when required customFields are undefined and missing a default value', async () => {
      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              ...defaultCustomFieldsConfiguration[0],
              required: true,
              defaultValue: undefined,
            },
            {
              ...defaultCustomFieldsConfiguration[1],
              required: true,
            },
          ],
        },
      ]);

      await expect(
        bulkCreate({ cases: getCases() }, clientArgs, casesClient)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: Missing required custom fields without default value configured: \\"label 1\\", \\"label 2\\""`
      );
    });

    it('throws error when the customFields array is too long', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill(theCustomFields[0]),
            }),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: The length of the field customFields is too long. Array must be of length <= 10."`
      );
    });

    it('throws error with duplicated customFields keys', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TOGGLE,
                  value: true,
                },
              ],
            }),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: Invalid duplicated customFields keys in request: duplicated_key"`
      );
    });

    it('throws error when customFields keys are not present in configuration', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [
                {
                  key: 'missing_key',
                  type: CustomFieldTypes.TEXT,
                  value: null,
                },
              ],
            }),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: Invalid custom field keys: missing_key"`
      );
    });

    it('throws when the customField types do not match the configuration', async () => {
      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [
                {
                  key: 'first_key',
                  type: CustomFieldTypes.TOGGLE,
                  value: true,
                },
                {
                  key: 'second_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'foobar',
                },
              ],
            }),
          },
          clientArgs,
          casesClient
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: The following custom fields have the wrong type in the request: \\"label 1\\", \\"label 2\\""`
      );
    });

    it('should get all configurations', async () => {
      await expect(
        bulkCreate({ cases: getCases({ customFields: theCustomFields }) }, clientArgs, casesClient)
      ).resolves.not.toThrow();

      expect(casesClient.configure.get).toHaveBeenCalledWith();
    });

    it('validate required custom fields from different owners', async () => {
      const casesWithDifferentOwners = [getCases()[0], getCases({ owner: 'cases' })[0]];

      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              key: 'sec_first_key',
              type: CustomFieldTypes.TEXT,
              label: 'sec custom field',
              required: false,
            },
          ],
        },
        {
          owner: 'cases',
          customFields: [
            {
              key: 'cases_first_key',
              type: CustomFieldTypes.TEXT,
              label: 'stack cases custom field',
              required: true,
            },
          ],
        },
      ]);

      await expect(
        bulkCreate({ cases: casesWithDifferentOwners }, clientArgs, casesClient)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to bulk create cases: Error: Missing required custom fields without default value configured: \\"stack cases custom field\\""`
      );
    });

    it('should fill out missing custom fields from different owners correctly', async () => {
      const casesWithDifferentOwners = [getCases()[0], getCases({ owner: 'cases' })[0]];

      casesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: theCase.owner,
          customFields: [
            {
              key: 'sec_first_key',
              type: CustomFieldTypes.TEXT,
              label: 'sec custom field',
              required: false,
            },
          ],
        },
        {
          owner: 'cases',
          customFields: [
            {
              key: 'cases_first_key',
              type: CustomFieldTypes.TEXT,
              label: 'stack cases custom field',
              required: false,
            },
          ],
        },
      ]);

      await bulkCreate({ cases: casesWithDifferentOwners }, clientArgs, casesClient);

      const cases = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases;

      expect(cases[0].owner).toBe('securitySolution');
      expect(cases[1].owner).toBe('cases');

      expect(cases[0].customFields).toEqual([{ key: 'sec_first_key', type: 'text', value: null }]);
      expect(cases[1].customFields).toEqual([
        { key: 'cases_first_key', type: 'text', value: null },
      ]);
    });
  });

  describe('User actions', () => {
    const theCase = getCases()[0];

    const caseWithOnlyRequiredFields = omit(theCase, [
      'assignees',
      'category',
      'severity',
      'customFields',
    ]) as CasePostRequest;

    const caseWithOptionalFields: CasePostRequest = {
      ...theCase,
      category: 'My category',
      severity: CaseSeverity.CRITICAL,
      customFields: [
        {
          key: 'first_customField_key',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        },
        {
          key: 'second_customField_key',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
      ],
    };

    const casesClient = createCasesClientMock();
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({ saved_objects: [caseSO] });

    casesClient.configure.get = jest.fn().mockResolvedValue([
      {
        owner: caseWithOptionalFields.owner,
        customFields: [
          {
            key: 'first_customField_key',
            type: CustomFieldTypes.TEXT,
            label: 'foo',
            required: false,
          },
          {
            key: 'second_customField_key',
            type: CustomFieldTypes.TOGGLE,
            label: 'foo',
            required: false,
          },
        ],
      },
    ]);

    it('should bulkCreate a user action with defaults correctly', async () => {
      await bulkCreate({ cases: [caseWithOnlyRequiredFields] }, clientArgs, casesClient);

      expect(
        clientArgs.services.userActionService.creator.bulkCreateUserAction
      ).toHaveBeenCalledWith({
        userActions: [
          {
            caseId: 'mock-id-1',
            owner: 'securitySolution',
            payload: {
              assignees: [],
              category: null,
              connector: { fields: null, id: 'none', name: 'none', type: '.none' },
              customFields: [],
              description: 'This is a brand new case of a bad meanie defacing data',
              owner: 'securitySolution',
              settings: { syncAlerts: true },
              severity: 'low',
              tags: ['defacement'],
              title: 'Super Bad Security Issue',
            },
            type: 'create_case',
            user: {
              email: 'damaged_raccoon@elastic.co',
              full_name: 'Damaged Raccoon',
              profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
              username: 'damaged_raccoon',
            },
          },
        ],
      });
    });

    it('should bulkCreate a user action with optional fields set correctly', async () => {
      await bulkCreate({ cases: [caseWithOptionalFields] }, clientArgs, casesClient);

      expect(
        clientArgs.services.userActionService.creator.bulkCreateUserAction
      ).toHaveBeenCalledWith({
        userActions: [
          {
            caseId: 'mock-id-1',
            owner: 'securitySolution',
            payload: {
              assignees: [],
              category: null,
              connector: { fields: null, id: 'none', name: 'none', type: '.none' },
              customFields: [],
              description: 'This is a brand new case of a bad meanie defacing data',
              owner: 'securitySolution',
              settings: { syncAlerts: true },
              severity: 'low',
              tags: ['defacement'],
              title: 'Super Bad Security Issue',
            },
            type: 'create_case',
            user: {
              email: 'damaged_raccoon@elastic.co',
              full_name: 'Damaged Raccoon',
              profile_uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
              username: 'damaged_raccoon',
            },
          },
        ],
      });
    });
  });
});
