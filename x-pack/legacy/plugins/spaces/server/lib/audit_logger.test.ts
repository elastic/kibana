/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SpacesAuditLogger } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#savedObjectsAuthorizationFailure`, () => {
  test('logs auth failure with spaceIds via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const spaceIds = ['foo-space-1', 'foo-space-2'];

    securityAuditLogger.spacesAuthorizationFailure(username, action, spaceIds);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_failure',
      expect.stringContaining(`${username} unauthorized to ${action} ${spaceIds.join(',')} spaces`),
      {
        username,
        action,
        spaceIds,
      }
    );
  });

  test('logs auth failure without spaceIds via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';

    securityAuditLogger.spacesAuthorizationFailure(username, action);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_failure',
      expect.stringContaining(`${username} unauthorized to ${action} spaces`),
      {
        username,
        action,
      }
    );
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test('logs auth success with spaceIds via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';
    const spaceIds = ['foo-space-1', 'foo-space-2'];

    securityAuditLogger.spacesAuthorizationSuccess(username, action, spaceIds);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_success',
      expect.stringContaining(`${username} authorized to ${action} ${spaceIds.join(',')} spaces`),
      {
        username,
        action,
        spaceIds,
      }
    );
  });

  test('logs auth success without spaceIds via auditLogger', () => {
    const auditLogger = createMockAuditLogger();
    const securityAuditLogger = new SpacesAuditLogger(auditLogger);
    const username = 'foo-user';
    const action = 'foo-action';

    securityAuditLogger.spacesAuthorizationSuccess(username, action);

    expect(auditLogger.log).toHaveBeenCalledWith(
      'spaces_authorization_success',
      expect.stringContaining(`${username} authorized to ${action} spaces`),
      {
        username,
        action,
      }
    );
  });
});
