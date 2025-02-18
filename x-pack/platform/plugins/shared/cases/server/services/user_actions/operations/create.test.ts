/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import { createSavedObjectsSerializerMock } from '../../../client/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { createConnectorObject } from '../../test_utils';
import { UserActionPersister } from './create';
import { createUserActionSO } from '../test_utils';
import type {
  BuilderParameters,
  BulkCreateAttachmentUserAction,
  CreateUserActionArgs,
} from '../types';
import type { UserActionPersistedAttributes } from '../../../common/types/user_actions';
import {
  getAssigneesAddedRemovedUserActions,
  getAssigneesAddedUserActions,
  getAssigneesRemovedUserActions,
  getBuiltUserActions,
  getTagsAddedRemovedUserActions,
  patchAddRemoveAssigneesCasesRequest,
  patchAssigneesCasesRequest,
  patchCasesRequest,
  patchAddCustomFieldsToOriginalCasesRequest,
  patchUpdateCustomFieldsCasesRequest,
  patchRemoveAssigneesCasesRequest,
  patchTagsCasesRequest,
  patchUpdateResetCustomFieldsCasesRequest,
  patchNewCustomFieldConfAdded,
  patchCustomFieldConfRemoved,
} from '../mocks';
import { AttachmentType } from '../../../../common/types/domain';

describe('UserActionPersister', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const auditMockLocker = auditLoggerMock.create();
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const savedObjectsSerializer = createSavedObjectsSerializerMock();

  let persister: UserActionPersister;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    persister = new UserActionPersister({
      log: mockLogger,
      unsecuredSavedObjectsClient,
      persistableStateAttachmentTypeRegistry,
      savedObjectsSerializer,
      auditLogger: auditMockLocker,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const getRequest = <T extends keyof BuilderParameters = 'connector'>(overrides = {}) =>
    ({
      userAction: {
        action: 'update' as const,
        type: 'connector' as const,
        caseId: 'test',
        payload: { connector: createConnectorObject().connector },
        connectorId: '1',
        owner: 'cases',
        user: { email: '', full_name: '', username: '' },
        ...overrides,
      },
    } as CreateUserActionArgs<T>);

  const getBulkCreateAttachmentRequest = (): BulkCreateAttachmentUserAction => ({
    caseId: 'test',
    attachments: [
      {
        id: '1',
        owner: 'cases',
        attachment: { comment: 'test', type: AttachmentType.user, owner: 'cases' },
      },
    ],
    user: { email: '', full_name: '', username: '' },
  });

  const testUser = { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' };

  describe('Decoding requests', () => {
    describe('createUserAction', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({
          attributes: createUserActionSO(),
          id: '1',
          type: CASE_USER_ACTION_SAVED_OBJECT,
          references: [],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        await expect(persister.createUserAction(getRequest())).resolves.not.toThrow();
      });

      it('throws if fields is omitted', async () => {
        const req = getRequest();
        unset(req, 'userAction.payload.connector.fields');

        await expect(persister.createUserAction(req)).rejects.toThrow(
          'Invalid value "undefined" supplied to "payload,connector,fields"'
        );
      });

      it('strips out excess attributes', async () => {
        const req = getRequest();
        set(req, 'payload.foo', 'bar');

        await expect(persister.createUserAction(req)).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.create.mock
          .calls[0][1] as UserActionPersistedAttributes;

        expect(persistedAttributes.payload).not.toHaveProperty('foo');
      });
    });

    describe('bulkCreateAttachmentCreation', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [
            {
              attributes: createUserActionSO(),
              id: '1',
              type: CASE_USER_ACTION_SAVED_OBJECT,
              references: [],
            },
          ],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        await expect(
          persister.bulkCreateUserAction({
            userActions: [getRequest().userAction],
          })
        ).resolves.not.toThrow();
      });

      it('throws if owner is omitted', async () => {
        const req = getRequest().userAction;
        unset(req, 'owner');

        await expect(
          persister.bulkCreateUserAction({
            userActions: [req],
          })
        ).rejects.toThrow('Invalid value "undefined" supplied to "owner"');
      });

      it('strips out excess attributes', async () => {
        const req = getRequest().userAction;
        set(req, 'payload.foo', 'bar');

        await expect(
          persister.bulkCreateUserAction({
            userActions: [req],
          })
        ).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0][0]
          .attributes as UserActionPersistedAttributes;

        expect(persistedAttributes.payload).not.toHaveProperty('foo');
      });
    });

    describe('bulkCreateUserAction', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [
            {
              attributes: createUserActionSO(),
              id: '1',
              type: CASE_USER_ACTION_SAVED_OBJECT,
              references: [],
            },
          ],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        await expect(
          persister.bulkCreateAttachmentCreation(getBulkCreateAttachmentRequest())
        ).resolves.not.toThrow();
      });

      it('throws if owner is omitted', async () => {
        const req = getBulkCreateAttachmentRequest();
        unset(req, 'attachments[0].owner');

        await expect(persister.bulkCreateAttachmentCreation(req)).rejects.toThrow(
          'Invalid value "undefined" supplied to "owner"'
        );
      });

      it('strips out excess attributes', async () => {
        const req = getBulkCreateAttachmentRequest();
        set(req, 'attachments[0].attachment.foo', 'bar');

        await expect(persister.bulkCreateAttachmentCreation(req)).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0][0]
          .attributes as UserActionPersistedAttributes;

        expect(persistedAttributes.payload).not.toHaveProperty('foo');
      });
    });
  });

  describe('buildUserActions', () => {
    it('creates the correct user actions when bulk updating cases', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchCasesRequest,
          user: testUser,
        })
      ).toEqual(getBuiltUserActions({ isMock: false }));
    });

    it('creates the correct user actions when an assignee is added', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(getAssigneesAddedUserActions({ isMock: false }));
    });

    it('creates the correct user actions when an assignee is removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchRemoveAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(getAssigneesRemovedUserActions({ isMock: false }));
    });

    it('creates the correct user actions when assignees are added and removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchAddRemoveAssigneesCasesRequest,
          user: testUser,
        })
      ).toEqual(
        getAssigneesAddedRemovedUserActions({
          isMock: false,
        })
      );
    });

    it('creates the correct user actions when tags are added and removed', async () => {
      expect(
        persister.buildUserActions({
          updatedCases: patchTagsCasesRequest,
          user: testUser,
        })
      ).toEqual(
        getTagsAddedRemovedUserActions({
          isMock: false,
        })
      );
    });

    describe('customFields', () => {
      it('creates the correct user actions when adding a new custom field to a case without custom fields', async () => {
        expect(
          persister.buildUserActions({
            updatedCases: patchAddCustomFieldsToOriginalCasesRequest,
            user: testUser,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "1": Array [
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_1",
                          "type": "text",
                          "value": "this is a text field value",
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
            ],
          }
        `);
      });

      it('creates the correct user actions when updating an existing custom field', async () => {
        expect(
          persister.buildUserActions({
            updatedCases: patchUpdateCustomFieldsCasesRequest,
            user: testUser,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "1": Array [
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_1",
                          "type": "text",
                          "value": "updated value",
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
            ],
          }
        `);
      });

      it('creates the correct user actions when updating and resetting custom fields', async () => {
        expect(
          persister.buildUserActions({
            updatedCases: patchUpdateResetCustomFieldsCasesRequest,
            user: testUser,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "1": Array [
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_1",
                          "type": "text",
                          "value": null,
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_2",
                          "type": "text",
                          "value": "new custom field 2",
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
            ],
          }
        `);
      });

      it('should create a user action only for the updated field and not for the added configuration', async () => {
        expect(
          persister.buildUserActions({
            updatedCases: patchNewCustomFieldConfAdded,
            user: testUser,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "1": Array [
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_1",
                          "type": "text",
                          "value": "new value",
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
            ],
          }
        `);
      });

      it('should create a user action only for the field that got updated and not for the removed configuration', async () => {
        expect(
          persister.buildUserActions({
            updatedCases: patchCustomFieldConfRemoved,
            user: testUser,
          })
        ).toMatchInlineSnapshot(`
          Object {
            "1": Array [
              Object {
                "eventDetails": Object {
                  "action": "update",
                  "descriptiveAction": "case_user_action_update_case_custom_fields",
                  "getMessage": [Function],
                  "savedObjectId": "1",
                  "savedObjectType": "cases",
                },
                "parameters": Object {
                  "attributes": Object {
                    "action": "update",
                    "created_at": "2022-01-09T22:00:00.000Z",
                    "created_by": Object {
                      "email": "elastic@elastic.co",
                      "full_name": "Elastic User",
                      "username": "elastic",
                    },
                    "owner": "securitySolution",
                    "payload": Object {
                      "customFields": Array [
                        Object {
                          "key": "string_custom_field_1",
                          "type": "text",
                          "value": "new value",
                        },
                      ],
                    },
                    "type": "customFields",
                  },
                  "references": Array [
                    Object {
                      "id": "1",
                      "name": "associated-cases",
                      "type": "cases",
                    },
                  ],
                },
              },
            ],
          }
        `);
      });
    });
  });

  describe('bulkCreateUserAction', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            attributes: [createUserActionSO()],
            id: '1',
            type: CASE_USER_ACTION_SAVED_OBJECT,
            references: [],
          },
          {
            attributes: [createUserActionSO()],
            id: '2',
            type: CASE_USER_ACTION_SAVED_OBJECT,
            references: [],
          },
        ],
      });
    });

    it('bulk creates the user actions correctly', async () => {
      const connectorUserAction = getRequest().userAction;
      const titleUserAction = getRequest<'title'>({
        type: 'title',
        payload: { title: 'my title' },
      }).userAction;

      await persister.bulkCreateUserAction({
        userActions: [connectorUserAction, titleUserAction],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {
              "action": "update",
              "created_at": "2022-01-09T22:00:00.000Z",
              "created_by": Object {
                "email": "",
                "full_name": "",
                "username": "",
              },
              "owner": "cases",
              "payload": Object {
                "connector": Object {
                  "fields": Object {
                    "issueType": "bug",
                    "parent": "2",
                    "priority": "high",
                  },
                  "name": ".jira",
                  "type": ".jira",
                },
              },
              "type": "connector",
            },
            "references": Array [
              Object {
                "id": "test",
                "name": "associated-cases",
                "type": "cases",
              },
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ],
            "type": "cases-user-actions",
          },
          Object {
            "attributes": Object {
              "action": "update",
              "created_at": "2022-01-09T22:00:00.000Z",
              "created_by": Object {
                "email": "",
                "full_name": "",
                "username": "",
              },
              "owner": "cases",
              "payload": Object {
                "title": "my title",
              },
              "type": "title",
            },
            "references": Array [
              Object {
                "id": "test",
                "name": "associated-cases",
                "type": "cases",
              },
            ],
            "type": "cases-user-actions",
          },
        ]
      `);
    });
  });
});
