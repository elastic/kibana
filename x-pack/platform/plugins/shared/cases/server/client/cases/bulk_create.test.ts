/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import Boom from '@hapi/boom';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_LENGTH_PER_TAG,
  MAX_TITLE_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_EXTENDED_FIELD_VALUE_BYTES,
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
      settings: { syncAlerts: true, extractObservables: true },
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

  describe('workflow events', () => {
    it('emits caseCreated events on successful bulk create', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO, { ...caseSO, id: 'mock-id-2' }],
      });

      await bulkCreate({ cases: [getCases()[0], getCases()[0]] }, clientArgs, casesClientMock);

      expect(clientArgs.casesEventBus.emitCaseCreated).toHaveBeenCalledTimes(2);
      expect(clientArgs.casesEventBus.emitCaseCreated).toHaveBeenNthCalledWith(
        1,
        clientArgs.request,
        { caseId: 'mock-id-1', owner: caseSO.attributes.owner }
      );
      expect(clientArgs.casesEventBus.emitCaseCreated).toHaveBeenNthCalledWith(
        2,
        clientArgs.request,
        { caseId: 'mock-id-2', owner: caseSO.attributes.owner }
      );
    });
  });

  describe('assignee identity population', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
      clientArgs.config = { ...clientArgs.config, assigneeIdentity: { enabled: true } };
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });
    });

    it('resolves every uid across all cases in a single bulkGet and populates identity', async () => {
      clientArgs.securityStartPlugin.userProfiles.bulkGet.mockResolvedValue([
        {
          uid: '1',
          enabled: true,
          data: {},
          user: { username: 'u1', full_name: 'User One', email: 'u1@e.com' },
        },
        {
          uid: '2',
          enabled: true,
          data: {},
          user: { username: 'u2', full_name: 'User Two', email: 'u2@e.com' },
        },
      ] as never);

      await bulkCreate(
        {
          cases: [
            getCases({ assignees: [{ uid: '1' }] })[0],
            getCases({ assignees: [{ uid: '2' }] })[0],
          ],
        },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.securityStartPlugin.userProfiles.bulkGet).toHaveBeenCalledTimes(1);
      const { cases } = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0];
      expect(cases[0].assignees).toEqual([
        { uid: '1', username: 'u1', full_name: 'User One', email: 'u1@e.com' },
      ]);
      expect(cases[1].assignees).toEqual([
        { uid: '2', username: 'u2', full_name: 'User Two', email: 'u2@e.com' },
      ]);
    });

    it('does not resolve profiles when the flag is disabled', async () => {
      clientArgs.config = { ...clientArgs.config, assigneeIdentity: { enabled: false } };

      await bulkCreate(
        { cases: getCases({ assignees: [{ uid: '1' }] }) },
        clientArgs,
        casesClientMock
      );

      expect(clientArgs.securityStartPlugin.userProfiles.bulkGet).not.toHaveBeenCalled();
      const { cases } = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0];
      expect(cases[0].assignees).toEqual([{ uid: '1' }]);
    });
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
    // This suite asserts the exact bulkCreateCases payload; the extended_fields
    // mirroring (templates flag ON) is covered by dedicated tests below.
    clientArgs.config = { ...clientArgs.config, templates: { enabled: false } };

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
              "incremental_id": undefined,
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "extractObservables": true,
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
              "totalEvents": 0,
              "total_observables": 0,
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
              "incremental_id": undefined,
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "extractObservables": true,
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
              "totalEvents": 0,
              "total_observables": 0,
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
              "incremental_id": undefined,
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "extractObservables": true,
                "syncAlerts": true,
              },
              "severity": "low",
              "status": "open",
              "tags": Array [],
              "title": "My Case",
              "total_observables": 0,
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
              "incremental_id": undefined,
              "observables": Array [],
              "owner": "securitySolution",
              "settings": Object {
                "extractObservables": true,
                "syncAlerts": true,
              },
              "severity": "critical",
              "status": "open",
              "tags": Array [],
              "title": "My Case",
              "total_observables": 0,
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

    it('rejects an extended field value that exceeds the maximum byte size before writing', async () => {
      // A real global field definition so the request first clears the definition-aware
      // key/type checks and the oversized value is what actually trips the rejection.
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          {
            fieldDefinitionId: 'fd-large',
            name: 'large',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: true,
            definition: 'name: large\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Large\n',
          },
        ],
        total: 1,
      });

      await expect(
        bulkCreate(
          {
            cases: getCases({
              extended_fields: {
                large_as_keyword: 'a'.repeat(MAX_EXTENDED_FIELD_VALUE_BYTES + 1),
              },
            }),
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        `Failed to bulk create cases: Error: Invalid extended_fields: Extended field "large_as_keyword" exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
      );

      expect(clientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
    });

    it('does not require a required global field the caller never sent (parity with the manual create path)', async () => {
      // Regression: bulkCreate (the cases connector's only path) has no way to fill in a value
      // for a field it doesn't know exists. Before this fix, `partial: false` was hardcoded here,
      // so any required global field with no default — even one totally unrelated to the request —
      // would silently break every automated case creation for that owner, the moment pairing
      // mirrored ANY other linked customField into extended_fields. create.ts's manual path already
      // skips this via `partial: !hadExtendedFieldsBeforeDefaults`; bulkCreate must match.
      const localClientArgs = createCasesClientMockArgs();
      const localCasesClient = createCasesClientMock();
      localCasesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: SECURITY_SOLUTION_OWNER,
          customFields: [
            { key: 'other_key', type: CustomFieldTypes.TEXT, label: 'Other', required: false },
          ],
        },
      ]);
      localClientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [
          // Required global field, unrelated to the request — no linked v1 customField at all.
          {
            fieldDefinitionId: 'fd-priority',
            name: 'priority',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: true,
            definition:
              'name: priority\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Priority\nvalidation:\n  required: true\n',
          },
          // Linked field that pairing mirrors, making extended_fields non-empty even though the
          // caller never sent extended_fields directly.
          {
            fieldDefinitionId: 'fd-other',
            name: 'other',
            owner: SECURITY_SOLUTION_OWNER,
            description: '',
            isGlobal: true,
            legacyKey: 'other_key',
            definition: 'name: other\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Other\n',
          },
        ],
        total: 2,
      });
      localClientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [{ key: 'other_key', type: CustomFieldTypes.TEXT, value: 'x' }],
            }),
          },
          localClientArgs,
          localCasesClient
        )
      ).resolves.not.toThrow();

      expect(localClientArgs.services.caseService.bulkCreateCases).toHaveBeenCalled();
    });

    it('rejects an extended field key that does not correspond to a global field definition', async () => {
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });

      await expect(
        bulkCreate(
          {
            cases: getCases({
              extended_fields: { unknown_as_keyword: 'value' },
            }),
          },
          clientArgs,
          casesClientMock
        )
      ).rejects.toThrow(
        'Failed to bulk create cases: Error: Invalid extended_fields: Unknown extended field key: "unknown_as_keyword". No fields are available for this case'
      );

      expect(clientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
    });
  });

  describe('global defaults injection and relaxRequiredFields', () => {
    const priorityWithDefault = {
      fieldDefinitionId: 'fd-priority',
      name: 'priority',
      owner: SECURITY_SOLUTION_OWNER,
      description: '',
      isGlobal: true,
      definition:
        'name: priority\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Priority\nmetadata:\n  default: "p3"\n',
    };

    const priorityRequiredNoDefault = {
      fieldDefinitionId: 'fd-priority',
      name: 'priority',
      owner: SECURITY_SOLUTION_OWNER,
      description: '',
      isGlobal: true,
      definition:
        'name: priority\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Priority\nvalidation:\n  required: true\n',
    };

    const notesField = {
      fieldDefinitionId: 'fd-notes',
      name: 'notes',
      owner: SECURITY_SOLUTION_OWNER,
      description: '',
      isGlobal: true,
      definition: 'name: notes\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Notes\n',
    };

    const countField = {
      fieldDefinitionId: 'fd-count',
      name: 'count',
      owner: SECURITY_SOLUTION_OWNER,
      description: '',
      isGlobal: true,
      definition: 'name: count\ntype: long\ncontrol: INPUT_NUMBER\nlabel: Count\n',
    };

    const setup = (fieldDefinitions: Array<typeof priorityWithDefault>) => {
      const localClientArgs = createCasesClientMockArgs();
      const localCasesClient = createCasesClientMock();
      localCasesClient.configure.get = jest.fn().mockResolvedValue([]);
      localClientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions,
        total: fieldDefinitions.length,
      });
      localClientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });
      return { localClientArgs, localCasesClient };
    };

    it('injects a global default the caller did not send', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityWithDefault]);

      await bulkCreate({ cases: getCases() }, localClientArgs, localCasesClient);

      expect(
        localClientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0]
          .extended_fields
      ).toEqual({ priority_as_keyword: 'p3' });
    });

    it('lets a caller-sent value win over the injected global default', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityWithDefault]);

      await bulkCreate(
        { cases: getCases({ extended_fields: { priority_as_keyword: 'p1' } }) },
        localClientArgs,
        localCasesClient
      );

      expect(
        localClientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0]
          .extended_fields
      ).toEqual({ priority_as_keyword: 'p1' });
    });

    it('does not inject anything for a global field without a default', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityRequiredNoDefault]);

      await bulkCreate({ cases: getCases() }, localClientArgs, localCasesClient);

      expect(
        localClientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0]
          .extended_fields
      ).toBeUndefined();
    });

    it('does not inject global defaults when the templates flag is disabled', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityWithDefault]);
      localClientArgs.config = {
        ...localClientArgs.config,
        templates: { enabled: false },
      };

      await bulkCreate({ cases: getCases() }, localClientArgs, localCasesClient);

      expect(
        localClientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0]
          .extended_fields
      ).toBeUndefined();
    });

    it('rejects a required no-default global field when the caller sent extended_fields and no relax option', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityRequiredNoDefault, notesField]);

      await expect(
        bulkCreate(
          { cases: getCases({ extended_fields: { notes_as_keyword: 'x' } }) },
          localClientArgs,
          localCasesClient
        )
      ).rejects.toThrow('Field "Priority" is required');

      expect(localClientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
    });

    it('relaxRequiredFields skips required enforcement for fields the caller could not fill', async () => {
      const { localClientArgs, localCasesClient } = setup([priorityRequiredNoDefault, notesField]);

      await expect(
        bulkCreate(
          { cases: getCases({ extended_fields: { notes_as_keyword: 'x' } }) },
          localClientArgs,
          localCasesClient,
          { relaxRequiredFields: true }
        )
      ).resolves.not.toThrow();

      expect(
        localClientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0]
          .extended_fields
      ).toEqual({ notes_as_keyword: 'x' });
    });

    it('relaxRequiredFields still validates the values that ARE present', async () => {
      const { localClientArgs, localCasesClient } = setup([countField]);

      await expect(
        bulkCreate(
          { cases: getCases({ extended_fields: { count_as_long: 'not-a-number' } }) },
          localClientArgs,
          localCasesClient,
          { relaxRequiredFields: true }
        )
      ).rejects.toThrow('Field "Count" must be a number');

      expect(localClientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
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
              settings: { syncAlerts: true, extractObservables: true },
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
              settings: { syncAlerts: true, extractObservables: true },
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

  describe('Template usage stats', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesClient = createCasesClientMock();
    casesClient.configure.get = jest.fn().mockResolvedValue([]);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('increments template usage stats when cases are created with a template', async () => {
      const caseSOWithTemplate = {
        ...caseSO,
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate],
      });

      await bulkCreate({ cases: getCases() }, clientArgs, casesClient);

      expect(clientArgs.services.templatesService.incrementUsageStats).toHaveBeenCalledWith(
        'tmpl-1',
        1
      );
    });

    it('adds one use per case, in a single call per template', async () => {
      const caseSOWithTemplate1 = {
        ...caseSO,
        id: 'case-1',
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };
      const caseSOWithTemplate2 = {
        ...caseSO,
        id: 'case-2',
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };
      const caseSOWithTemplate3 = {
        ...caseSO,
        id: 'case-3',
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-2', version: 1 } },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate1, caseSOWithTemplate2, caseSOWithTemplate3],
      });

      await bulkCreate(
        { cases: [getCases()[0], getCases()[0], getCases()[0]] },
        clientArgs,
        casesClient
      );

      // Two cases share tmpl-1, so it gains two uses from one call — the tally counts cases, while
      // the call is still deduped per template to keep the writes down.
      expect(clientArgs.services.templatesService.incrementUsageStats).toHaveBeenCalledTimes(2);
      expect(clientArgs.services.templatesService.incrementUsageStats).toHaveBeenCalledWith(
        'tmpl-1',
        2
      );
      expect(clientArgs.services.templatesService.incrementUsageStats).toHaveBeenCalledWith(
        'tmpl-2',
        1
      );
    });

    it('does not increment template usage stats when no template is provided', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate({ cases: getCases() }, clientArgs, casesClient);

      expect(clientArgs.services.templatesService.incrementUsageStats).not.toHaveBeenCalled();
    });

    it('does not fail case creation when template stats update fails', async () => {
      const caseSOWithTemplate = {
        ...caseSO,
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };

      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate],
      });

      clientArgs.services.templatesService.incrementUsageStats.mockRejectedValueOnce(
        new Error('stats update failed')
      );

      await expect(
        bulkCreate({ cases: getCases() }, clientArgs, casesClient)
      ).resolves.not.toThrow();
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update template usage stats')
      );
    });

    it('rejects a template reference without a pinned version (no server-side expansion on bulkCreate)', async () => {
      await expect(
        bulkCreate({ cases: getCases({ template: { id: 'tmpl-1' } }) }, clientArgs, casesClient)
      ).rejects.toThrow('template.version is required');
      expect(clientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
    });

    it('accepts a version-pinned template reference', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await expect(
        bulkCreate(
          { cases: getCases({ template: { id: 'tmpl-1', version: 2 } }) },
          clientArgs,
          casesClient
        )
      ).resolves.not.toThrow();
    });

    it('records a template user action (with point-in-time name) when the flag is enabled', async () => {
      const flagOnClientArgs = createCasesClientMockArgs();
      flagOnClientArgs.config = { ...flagOnClientArgs.config, templates: { enabled: true } };
      const caseSOWithTemplate = {
        ...caseSO,
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };
      flagOnClientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate],
      });
      flagOnClientArgs.services.templatesService.getTemplate.mockResolvedValue({
        attributes: { name: 'My Template' },
      } as Awaited<ReturnType<typeof flagOnClientArgs.services.templatesService.getTemplate>>);

      await bulkCreate({ cases: getCases() }, flagOnClientArgs, casesClient);

      expect(flagOnClientArgs.services.templatesService.getTemplate).toHaveBeenCalledWith(
        'tmpl-1',
        '1'
      );
      expect(
        flagOnClientArgs.services.userActionService.creator.bulkCreateUserAction
      ).toHaveBeenCalledWith({
        userActions: expect.arrayContaining([
          expect.objectContaining({
            type: 'template',
            caseId: caseSOWithTemplate.id,
            owner: caseSOWithTemplate.attributes.owner,
            payload: { template: { id: 'tmpl-1', version: 1, name: 'My Template' } },
          }),
        ]),
      });
    });

    it('does not record a template user action when the templates flag is disabled', async () => {
      const flagOffClientArgs = createCasesClientMockArgs();
      flagOffClientArgs.config = { ...flagOffClientArgs.config, templates: { enabled: false } };
      const caseSOWithTemplate = {
        ...caseSO,
        attributes: { ...caseSO.attributes, template: { id: 'tmpl-1', version: 1 } },
      };
      flagOffClientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate],
      });

      await bulkCreate({ cases: getCases() }, flagOffClientArgs, casesClient);

      const [{ userActions: recordedUserActions }] =
        flagOffClientArgs.services.userActionService.creator.bulkCreateUserAction.mock.calls[0];
      expect(recordedUserActions.some((ua: { type: string }) => ua.type === 'template')).toBe(
        false
      );
      expect(flagOffClientArgs.services.templatesService.getTemplate).not.toHaveBeenCalled();
    });
  });

  describe('Template usage counters', () => {
    const usageCounter = usageCollectionPluginMock
      .createSetupContract()
      .createUsageCounter('cases');
    const clientArgs = { ...createCasesClientMockArgs(), usageCounter };
    const casesClient = createCasesClientMock();
    casesClient.configure.get = jest.fn().mockResolvedValue([]);

    const caseSOWithTemplate = (id: string, templateId: string) => ({
      ...caseSO,
      id,
      attributes: { ...caseSO.attributes, template: { id: templateId, version: 1 } },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('counts created cases, not distinct templates', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSOWithTemplate('case-1', 'tmpl-1'),
          caseSOWithTemplate('case-2', 'tmpl-1'),
          { ...caseSO, id: 'case-3' },
        ],
      });

      await bulkCreate(
        { cases: [getCases()[0], getCases()[0], getCases()[0]] },
        clientArgs,
        casesClient
      );

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(2);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'create_case_with_template',
        counterType: 'cases_client.rest_api',
        incrementBy: 2,
      });
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'create_case_without_template',
        counterType: 'cases_client.rest_api',
        incrementBy: 1,
      });
    });

    it('does not emit a counter for an empty bucket', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate({ cases: getCases() }, clientArgs, casesClient);

      expect(usageCounter.incrementCounter).not.toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'create_case_with_template' })
      );
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'create_case_without_template',
        counterType: 'cases_client.rest_api',
        incrementBy: 1,
      });
    });

    it('attributes counters to the calling source', async () => {
      const connectorArgs = {
        ...createCasesClientMockArgs(),
        usageCounter,
        clientSource: 'connector' as const,
      };
      connectorArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate('case-1', 'tmpl-1')],
      });

      await bulkCreate({ cases: getCases() }, connectorArgs, casesClient);

      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'create_case_with_template',
        counterType: 'cases_client.connector',
        incrementBy: 1,
      });
    });

    it('does not count a bulk create that failed', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockRejectedValueOnce(
        new Error('bulk create failed')
      );

      await expect(bulkCreate({ cases: getCases() }, clientArgs, casesClient)).rejects.toThrow();

      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    // The realistic partial failure is a resolved response carrying an error entry, which is a
    // different branch from a rejected write — nothing may be counted, not even the cases that
    // did persist.
    it('does not count a bulk create whose saved object write partially failed', async () => {
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [
          caseSOWithTemplate('case-1', 'tmpl-1'),
          {
            type: 'cases',
            id: 'case-2',
            error: { error: 'Conflict', message: 'conflict', statusCode: 409 },
          },
        ],
      });

      await expect(bulkCreate({ cases: getCases() }, clientArgs, casesClient)).rejects.toThrow();

      expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    });
  });

  describe('customFields → extended_fields adapter (write-time mirror)', () => {
    const adapterCustomFieldsCfg = [
      { key: 'priority', type: CustomFieldTypes.TEXT, label: 'Priority', required: false },
      { key: 'count', type: CustomFieldTypes.NUMBER, label: 'Count', required: false },
    ];

    const adapterCustomFields: CaseCustomFields = [
      { key: 'priority', type: CustomFieldTypes.TEXT, value: 'high' },
      { key: 'count', type: CustomFieldTypes.NUMBER, value: 3 },
    ];

    const adapterCasesClient = createCasesClientMock();

    // Linked v2 definitions for the configured v1 fields — write-time mirroring
    // only writes keys that resolve to a definition (via legacyKey or name).
    const adapterFieldDefinitions = [
      {
        fieldDefinitionId: 'fd-priority',
        name: 'priority',
        owner: SECURITY_SOLUTION_OWNER,
        description: '',
        isGlobal: true,
        legacyKey: 'priority',
        definition: 'name: priority\ntype: keyword\ncontrol: INPUT_TEXT\nlabel: Priority\n',
      },
      {
        fieldDefinitionId: 'fd-count',
        name: 'count',
        owner: SECURITY_SOLUTION_OWNER,
        description: '',
        isGlobal: true,
        legacyKey: 'count',
        definition: 'name: count\ntype: integer\ncontrol: INPUT_NUMBER\nlabel: Count\n',
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      adapterCasesClient.configure.get = jest
        .fn()
        .mockResolvedValue([
          { owner: SECURITY_SOLUTION_OWNER, customFields: adapterCustomFieldsCfg },
        ]);
    });

    it('mirrors customFields into extended_fields when templates flag is enabled', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate(
        { cases: getCases({ customFields: adapterCustomFields }) },
        clientArgs,
        adapterCasesClient
      );

      const createdCase = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0];
      expect(createdCase.extended_fields).toMatchObject({
        priority_as_keyword: 'high',
        count_as_integer: '3',
      });
    });

    it('mirrors customFields into extended_fields even when templates flag is disabled (addendum A1)', async () => {
      // Pairing for existing links runs independently of the feature flag: once
      // a link exists, live sync must not depend on xpack.cases.templates.enabled.
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: false } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate(
        { cases: getCases({ customFields: adapterCustomFields }) },
        clientArgs,
        adapterCasesClient
      );

      const createdCase = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0];
      expect(createdCase.extended_fields).toMatchObject({
        priority_as_keyword: 'high',
        count_as_integer: '3',
      });
    });

    it('rejects conflicting explicit dual input with a structured 400 instead of picking a side', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await expect(
        bulkCreate(
          {
            cases: getCases({
              customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'low' }],
              extended_fields: { priority_as_keyword: 'critical' },
            }),
          },
          clientArgs,
          adapterCasesClient
        )
      ).rejects.toThrow(
        'conflicting values for both representations of the linked field(s): "priority"'
      );

      expect(clientArgs.services.caseService.bulkCreateCases).not.toHaveBeenCalled();
    });

    it('accepts semantically equal explicit dual input and persists one canonical pair', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate(
        {
          cases: getCases({
            customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'same' }],
            extended_fields: { priority_as_keyword: 'same' },
          }),
        },
        clientArgs,
        adapterCasesClient
      );

      const createdCase = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0];
      expect(createdCase.extended_fields?.priority_as_keyword).toBe('same');
    });

    it('preserves a mirror key for a customField absent from the request (synthetic-null regression)', async () => {
      // FAILURE SCENARIO (before fix): fillMissingCustomFields pads { key: 'priority', value: null }
      // for the absent 'priority' field; the merge then deletes priority_as_keyword — even though
      // the request never submitted priority. Fix: mirror only request-provided customFields.
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate(
        {
          cases: getCases({
            // Only count is provided — priority is absent from the request.
            customFields: [{ key: 'count', type: CustomFieldTypes.NUMBER, value: 3 }],
            // priority_as_keyword pre-set by a template default in extended_fields.
            extended_fields: { priority_as_keyword: 'crit' },
          }),
        },
        clientArgs,
        adapterCasesClient
      );

      const createdCase = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0];
      // priority was not submitted — its mirror key must be preserved.
      expect(createdCase.extended_fields?.priority_as_keyword).toBe('crit');
      // count was submitted — it must still be mirrored.
      expect(createdCase.extended_fields?.count_as_integer).toBe('3');
    });

    it('creates successfully when two required linked fields are split across customFields and extended_fields', async () => {
      // FAILURE SCENARIO (before fix): pre-pair validation only saw its own representation —
      // the customFields-required check never looked at extended_fields, and the extended_fields
      // pre-pair check ran before pairing had mirrored `priority` over, so `count` (sent only via
      // extended_fields) or `priority` (sent only via customFields) could be wrongly rejected as
      // "missing" even though pairing would have produced a fully valid final map.
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };
      adapterCasesClient.configure.get = jest.fn().mockResolvedValue([
        {
          owner: SECURITY_SOLUTION_OWNER,
          customFields: adapterCustomFieldsCfg.map((cf) => ({ ...cf, required: true })),
        },
      ]);
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: adapterFieldDefinitions,
        total: adapterFieldDefinitions.length,
      });
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSO],
      });

      await bulkCreate(
        {
          cases: getCases({
            // priority supplied via customFields only; count supplied via extended_fields only.
            customFields: [{ key: 'priority', type: CustomFieldTypes.TEXT, value: 'high' }],
            extended_fields: { count_as_integer: '3' },
          }),
        },
        clientArgs,
        adapterCasesClient
      );

      const createdCase = clientArgs.services.caseService.bulkCreateCases.mock.calls[0][0].cases[0];
      expect(createdCase.extended_fields).toMatchObject({
        priority_as_keyword: 'high',
        count_as_integer: '3',
      });
      expect(createdCase.customFields).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ key: 'priority', value: 'high' }),
          expect.objectContaining({ key: 'count', value: 3 }),
        ])
      );
    });
  });

  describe('extended_fields user action baseline filtering (connector-created cases)', () => {
    it('omits untouched template defaults from the activity log but keeps the caller-changed value', async () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.config = { ...clientArgs.config, templates: { enabled: true } };

      const caseSOWithTemplate = {
        ...caseSO,
        attributes: {
          ...caseSO.attributes,
          template: { id: 'tmpl-1', version: 1 },
          // priority matches the template default untouched; count was changed by the caller.
          extended_fields: { priority_as_keyword: 'default-priority', count_as_integer: '9' },
        },
      };
      clientArgs.services.caseService.bulkCreateCases.mockResolvedValue({
        saved_objects: [caseSOWithTemplate],
      });
      clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [],
        total: 0,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue({
        attributes: {
          owner: SECURITY_SOLUTION_OWNER,
          definition: JSON.stringify({
            name: 'My Template',
            fields: [
              {
                control: 'INPUT_TEXT',
                name: 'priority',
                type: 'keyword',
                label: 'Priority',
                metadata: { default: 'default-priority' },
              },
              {
                control: 'INPUT_NUMBER',
                name: 'count',
                type: 'integer',
                label: 'Count',
                metadata: { default: 1 },
              },
            ],
          }),
        },
      } as Awaited<ReturnType<typeof clientArgs.services.templatesService.getTemplate>>);

      await bulkCreate({ cases: getCases() }, clientArgs, casesClientMock);

      const [{ userActions: recordedUserActions }] =
        clientArgs.services.userActionService.creator.bulkCreateUserAction.mock.calls[0];
      const extendedFieldsAction = recordedUserActions.find(
        (ua: { type: string }) => ua.type === 'extended_fields'
      );

      expect(extendedFieldsAction?.payload).toEqual({
        extended_fields: { count_as_integer: '9' },
      });
    });
  });
});
