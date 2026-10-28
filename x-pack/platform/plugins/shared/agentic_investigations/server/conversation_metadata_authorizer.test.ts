/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from './escalations/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from './investigations/constants';
import { createConversationMetadataAuthorizer } from './conversation_metadata_authorizer';

const request = httpServerMock.createKibanaRequest();

const ESCALATIONS_MANAGE = `api:${ESCALATIONS_API_PRIVILEGE_MANAGE}`;
const INVESTIGATIONS_MANAGE = `api:${INVESTIGATIONS_API_PRIVILEGE_MANAGE}`;

const createSecurity = (authorized: Record<string, boolean>) => {
  const checkPrivileges = jest.fn().mockImplementation(async ({ kibana }: { kibana: string[] }) => {
    const privileges = kibana.map((privilege) => ({
      privilege,
      authorized: authorized[privilege] === true,
    }));
    return {
      hasAllRequested: privileges.every((privilege) => privilege.authorized),
      privileges: { kibana: privileges },
    };
  });
  return {
    security: {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    } as unknown as SecurityPluginStart,
    checkPrivileges,
  };
};

const createAuthorizer = ({
  authorized = {},
  security,
  escalationsEnabled = true,
  logger = loggerMock.create(),
}: {
  authorized?: Record<string, boolean>;
  security?: SecurityPluginStart;
  escalationsEnabled?: boolean;
  logger?: ReturnType<typeof loggerMock.create>;
} = {}) => {
  const created = security ? { security, checkPrivileges: jest.fn() } : createSecurity(authorized);
  const authorizer = createConversationMetadataAuthorizer({
    getSecurity: async () => created.security,
    logger,
    escalationsEnabled,
  });
  return { authorizer, checkPrivileges: created.checkPrivileges, logger };
};

describe('createConversationMetadataAuthorizer', () => {
  it('denies a viewer closing an escalation', async () => {
    const { authorizer } = createAuthorizer();

    await expect(
      authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { status: 'closed', close_reason: 'false_positive' },
      })
    ).rejects.toMatchObject({
      code: 'forbidden',
      message: 'The user is not allowed to change status, close_reason.',
    });
  });

  it('denies escalation status when only one of the two manage privileges is held', async () => {
    const investigationsOnly = createAuthorizer({
      authorized: { [INVESTIGATIONS_MANAGE]: true },
    });
    const escalationsOnly = createAuthorizer({
      authorized: { [ESCALATIONS_MANAGE]: true },
    });

    await expect(
      investigationsOnly.authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { status: 'closed' },
      })
    ).rejects.toMatchObject({ message: 'The user is not allowed to change status.' });
    await expect(
      escalationsOnly.authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { status: 'closed' },
      })
    ).rejects.toMatchObject({ message: 'The user is not allowed to change status.' });
  });

  it('allows escalation status when both manage privileges are held', async () => {
    const { authorizer } = createAuthorizer({
      authorized: { [ESCALATIONS_MANAGE]: true, [INVESTIGATIONS_MANAGE]: true },
    });

    await expect(
      authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { status: 'closed', close_reason: 'resolved' },
      })
    ).resolves.toBeUndefined();
  });

  it('allows a viewer to write ungated fields such as summary', async () => {
    const { authorizer, checkPrivileges } = createAuthorizer();

    await expect(
      authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { summary: 'what happened' },
      })
    ).resolves.toBeUndefined();
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  it('requires only manage_investigations to change an investigation status', async () => {
    const viewer = createAuthorizer();
    const manager = createAuthorizer({ authorized: { [INVESTIGATIONS_MANAGE]: true } });

    await expect(
      viewer.authorizer.authorize(request, {
        templateId: 'investigation',
        updates: { status: 'closed' },
      })
    ).rejects.toMatchObject({ message: 'The user is not allowed to change status.' });
    await expect(
      manager.authorizer.authorize(request, {
        templateId: 'investigation',
        updates: { status: 'closed', close_reason: 'resolved', assignees: ['user-1'] },
      })
    ).resolves.toBeUndefined();
  });

  it('names every gated escalation field in one denial and still allows summary', async () => {
    const { authorizer } = createAuthorizer();

    await expect(
      authorizer.authorize(request, {
        templateId: 'escalation',
        updates: {
          status: 'closed',
          summary: 'what happened',
          close_reason: 'false_positive',
          assignees: ['user-1'],
          linked_investigations: ['inv-1'],
        },
      })
    ).rejects.toMatchObject({
      message:
        'The user is not allowed to change status, close_reason, assignees, linked_investigations.',
    });
  });

  it('fails closed when security is unavailable', async () => {
    const logger = loggerMock.create();
    const authorizer = createConversationMetadataAuthorizer({
      getSecurity: async () => undefined,
      logger,
      escalationsEnabled: true,
    });

    await expect(
      authorizer.authorize(request, {
        templateId: 'investigation',
        updates: { status: 'closed' },
      })
    ).rejects.toMatchObject({ message: 'The user is not allowed to change status.' });
    await expect(
      authorizer.authorize(request, {
        templateId: 'investigation',
        updates: { summary: 'still writable' },
      })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fails closed'));
  });

  it('denies escalation field writes when escalations are disabled', async () => {
    const { authorizer, checkPrivileges } = createAuthorizer({
      authorized: { [ESCALATIONS_MANAGE]: true, [INVESTIGATIONS_MANAGE]: true },
      escalationsEnabled: false,
    });

    await expect(
      authorizer.authorize(request, {
        templateId: 'escalation',
        updates: { status: 'closed' },
      })
    ).rejects.toMatchObject({ message: 'The user is not allowed to change status.' });
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  it('ignores templates it does not own', async () => {
    const { authorizer, checkPrivileges } = createAuthorizer();

    await expect(
      authorizer.authorize(request, { templateId: 'notes', updates: { status: 'closed' } })
    ).resolves.toBeUndefined();
    expect(checkPrivileges).not.toHaveBeenCalled();
  });
});
