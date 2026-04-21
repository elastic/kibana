/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import type { UserActionParameters } from '../types';
import { TemplateUserActionBuilder } from './template';

describe('TemplateUserActionBuilder', () => {
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

  const baseArgs = {
    action: 'update' as const,
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'cases',
  };

  let builder: TemplateUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    builder = new TemplateUserActionBuilder({ persistableStateAttachmentTypeRegistry });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('when a template is applied', () => {
    const args: UserActionParameters<'template'> = {
      ...baseArgs,
      payload: { template: { id: 'tmpl-1', version: 3 } },
    };

    it('builds the action correctly', () => {
      const res = builder.build(args);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "eventDetails": Object {
            "action": "update",
            "descriptiveAction": "case_user_action_change_applied_template",
            "getMessage": [Function],
            "savedObjectId": "test-id",
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
              "owner": "cases",
              "payload": Object {
                "template": Object {
                  "id": "tmpl-1",
                  "version": 3,
                },
              },
              "type": "template",
            },
            "references": Array [
              Object {
                "id": "test-id",
                "name": "associated-cases",
                "type": "cases",
              },
            ],
          },
        }
      `);
    });

    it('generates the correct log message', () => {
      const res = builder.build(args);

      expect(res.eventDetails.getMessage('ua-id')).toBe(
        'User changed applied template for case id: test-id - user action id: ua-id'
      );
    });

    it('generates the correct log message when id is undefined', () => {
      const res = builder.build(args);

      expect(res.eventDetails.getMessage()).toBe(
        'User changed applied template for case id: test-id - user action id: undefined'
      );
    });
  });

  describe('when a template is removed', () => {
    const args: UserActionParameters<'template'> = {
      ...baseArgs,
      payload: { template: null },
    };

    it('builds the action correctly with null template', () => {
      const res = builder.build(args);

      expect(res.parameters.attributes.payload).toEqual({ template: null });
      expect(res.parameters.attributes.type).toBe('template');
    });

    it('generates the correct log message', () => {
      const res = builder.build(args);

      expect(res.eventDetails.getMessage('ua-id')).toBe(
        'User changed applied template for case id: test-id - user action id: ua-id'
      );
    });
  });
});
