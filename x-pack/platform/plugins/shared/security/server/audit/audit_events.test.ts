/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import { httpServerMock } from '@kbn/core/server/mocks';

import {
  httpRequestEvent,
  savedObjectEvent,
  sessionCleanupConcurrentLimitEvent,
  sessionCleanupEvent,
  SpaceAuditAction,
  spaceAuditEvent,
  userLoginEvent,
  userLogoutEvent,
  userSessionConcurrentLimitLogoutEvent,
} from './audit_events';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { AuthenticationResult } from '../authentication';
import { AuditAction } from '../saved_objects/saved_objects_security_extension';

describe('#savedObjectEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID', name: 'test_dashboard' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "name": "test_dashboard",
            "type": "dashboard",
          },
          "unauthorized_spaces": undefined,
          "unauthorized_types": undefined,
        },
        "message": "User is creating dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.CREATE,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID', name: 'test_dashboard' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_create",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "name": "test_dashboard",
            "type": "dashboard",
          },
          "unauthorized_spaces": undefined,
          "unauthorized_types": undefined,
        },
        "message": "User has created dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.CREATE,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID', name: 'test_dashboard' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "saved_object_create",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "name": "test_dashboard",
            "type": "dashboard",
          },
          "unauthorized_spaces": undefined,
          "unauthorized_types": undefined,
        },
        "message": "Failed attempt to create dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('does create event for read access of saved objects', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.GET,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.RESOLVE,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.FIND,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
  });

  test('does not create event for read access of config or telemetry objects', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.GET,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.GET,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID', name: 'telemetry_name' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.RESOLVE,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID', name: 'config_name' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.RESOLVE,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.FIND,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.FIND,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
  });

  test('does create event for write access of config or telemetry objects', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.UPDATE,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID', name: 'config_name' },
      })
    ).not.toBeUndefined();
    expect(
      savedObjectEvent({
        action: AuditAction.UPDATE,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID', name: 'telemetry_name' },
      })
    ).not.toBeUndefined();
  });

  test('creates event with `success` outcome for `REMOVE_REFERENCES` action', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.REMOVE_REFERENCES,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_remove_references",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
          "unauthorized_spaces": undefined,
          "unauthorized_types": undefined,
        },
        "message": "User has removed references to dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('can create event with `add_to_spaces` and `delete_from_spaces`', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.UPDATE_OBJECTS_SPACES,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
        addToSpaces: ['space1', 'space3', 'space5'],
        deleteFromSpaces: ['space2', 'space4', 'space6'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_update_objects_spaces",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
        },
        "kibana": Object {
          "add_to_spaces": Array [
            "space1",
            "space3",
            "space5",
          ],
          "delete_from_spaces": Array [
            "space2",
            "space4",
            "space6",
          ],
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
          "unauthorized_spaces": undefined,
          "unauthorized_types": undefined,
        },
        "message": "User has updated spaces of dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('can create event with `requested_spaces` and `requested_types`', () => {
    expect(
      savedObjectEvent({
        action: AuditAction.FIND,
        savedObject: undefined,
        unauthorizedSpaces: ['space1', 'space2', 'space3'],
        unauthorizedTypes: ['x', 'y', 'z'],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_find",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": undefined,
          "unauthorized_spaces": Array [
            "space1",
            "space2",
            "space3",
          ],
          "unauthorized_types": Array [
            "x",
            "y",
            "z",
          ],
        },
        "message": "User has accessed saved objects",
      }
    `);
  });
});

describe('#userLoginEvent', () => {
  test('creates event with `success` outcome', () => {
    expect(
      userLoginEvent({
        authenticationResult: AuthenticationResult.succeeded(mockAuthenticatedUser()),
        authenticationProvider: 'basic1',
        authenticationType: 'basic',
        sessionId: '123',
        userProfileId: 'uid',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "user_login",
          "category": Array [
            "authentication",
          ],
          "outcome": "success",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": "native1",
          "authentication_type": "basic",
          "lookup_realm": "native1",
          "session_id": "123",
          "space_id": undefined,
        },
        "message": "User [user] has logged in using basic provider [name=basic1]",
        "user": Object {
          "id": "uid",
          "name": "user",
          "roles": Array [
            "user-role",
          ],
        },
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      userLoginEvent({
        authenticationResult: AuthenticationResult.failed(new Error('Not Authorized')),
        authenticationProvider: 'basic1',
        authenticationType: 'basic',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "Not Authorized",
        },
        "event": Object {
          "action": "user_login",
          "category": Array [
            "authentication",
          ],
          "outcome": "failure",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": undefined,
          "authentication_type": "basic",
          "lookup_realm": undefined,
          "session_id": undefined,
          "space_id": undefined,
        },
        "message": "Failed attempt to login using basic provider [name=basic1]",
        "user": undefined,
      }
    `);
  });
});

describe('#userLogoutEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      userLogoutEvent({
        username: 'elastic',
        provider: { name: 'basic1', type: 'basic' },
        userProfileId: 'uid',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [elastic] is logging out using basic provider [name=basic1]",
        "user": Object {
          "id": "uid",
          "name": "elastic",
        },
      }
    `);

    expect(
      userLogoutEvent({
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [undefined] is logging out using basic provider [name=basic1]",
        "user": undefined,
      }
    `);
  });
});

describe('#userSessionConcurrentLimitLogoutEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      userSessionConcurrentLimitLogoutEvent({
        username: 'elastic',
        provider: { name: 'basic1', type: 'basic' },
        userProfileId: 'uid',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [elastic] is logging out due to exceeded concurrent sessions limit for basic provider [name=basic1]",
        "user": Object {
          "id": "uid",
          "name": "elastic",
        },
      }
    `);

    expect(
      userSessionConcurrentLimitLogoutEvent({
        username: 'elastic',
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [elastic] is logging out due to exceeded concurrent sessions limit for basic provider [name=basic1]",
        "user": Object {
          "id": undefined,
          "name": "elastic",
        },
      }
    `);
  });
});

describe('#sessionCleanupEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      sessionCleanupEvent({
        usernameHash: 'abcdef',
        sessionId: 'sid',
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "session_cleanup",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
          "session_id": "sid",
        },
        "message": "Removing invalid or expired session for user [hash=abcdef]",
        "user": Object {
          "hash": "abcdef",
        },
      }
    `);
  });
});

describe('#sessionCleanupConcurrentLimitEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      sessionCleanupConcurrentLimitEvent({
        usernameHash: 'abcdef',
        sessionId: 'sid',
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "session_cleanup",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
          "session_id": "sid",
        },
        "message": "Removing session for user [hash=abcdef] due to exceeded concurrent sessions limit",
        "user": Object {
          "hash": "abcdef",
        },
      }
    `);
  });
});

describe('#httpRequestEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      httpRequestEvent({
        request: httpServerMock.createKibanaRequest(),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "http_request",
          "category": Array [
            "web",
          ],
          "outcome": "unknown",
        },
        "http": Object {
          "request": Object {
            "method": "get",
          },
        },
        "message": "User is requesting [/path] endpoint",
        "url": Object {
          "domain": "localhost",
          "path": "/path",
          "port": undefined,
          "query": undefined,
          "scheme": "http",
        },
      }
    `);
  });

  test('uses original URL if rewritten', () => {
    expect(
      httpRequestEvent({
        request: httpServerMock.createKibanaRequest({
          path: '/path',
          query: { query: 'param' },
          kibanaRequestState: {
            requestId: '123',
            requestUuid: '123e4567-e89b-12d3-a456-426614174000',
            rewrittenUrl: new URL('http://localhost/original/path?query=param'),
          },
        }),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "http_request",
          "category": Array [
            "web",
          ],
          "outcome": "unknown",
        },
        "http": Object {
          "request": Object {
            "method": "get",
          },
        },
        "message": "User is requesting [/original/path] endpoint",
        "url": Object {
          "domain": "localhost",
          "path": "/original/path",
          "port": undefined,
          "query": "query=param",
          "scheme": "http",
        },
      }
    `);
  });
});

describe('#spaceAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id: 'SPACE_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "space_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "User is creating space [id=SPACE_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        savedObject: { type: 'space', id: 'SPACE_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "space_create",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "User has created space [id=SPACE_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        savedObject: { type: 'space', id: 'SPACE_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "space_create",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "Failed attempt to create space [id=SPACE_ID]",
      }
    `);
  });
});
