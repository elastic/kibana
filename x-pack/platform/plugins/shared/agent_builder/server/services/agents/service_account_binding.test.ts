/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CoreServiceAccountsService } from '@kbn/core/server';
import {
  AgentAccessControlMode,
  agentBuilderDefaultAgentId,
  isBadRequestError,
  isForbiddenError,
  type CurrentUser,
} from '@kbn/agent-builder-common';
import type { AgentProfileStorage, AgentProperties } from './persisted/client/storage';
import {
  AGENT_WORKLOAD_TYPE,
  assertCanConfigureExecutionIdentity,
  assertCanEditBoundAgent,
  assertCanDeleteBoundAgent,
  resolveAgentWorkloads,
  unbindDeletedAgent,
} from './service_account_binding';

const owner: CurrentUser = {
  id: 'owner-id',
  username: 'alice',
  isAdmin: false,
  canManageSecurity: false,
};
const securityOwner: CurrentUser = { ...owner, canManageSecurity: true };
const manageSecurityOnly: CurrentUser = {
  id: 'other-id',
  username: 'bob',
  isAdmin: false,
  canManageSecurity: true,
};

const createSource = (overrides: Partial<AgentProperties> = {}): AgentProperties => ({
  id: 'agent-1',
  name: 'Agent one',
  type: 'chat',
  space: 'default',
  description: '',
  created_by_id: owner.id,
  created_by_name: owner.username,
  access_control: { access_mode: AgentAccessControlMode.Private, entries: [] },
  config: { tools: [] },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createServiceAccounts = (
  overrides: Partial<jest.Mocked<CoreServiceAccountsService>> = {}
): jest.Mocked<CoreServiceAccountsService> =>
  ({
    isEnabled: jest.fn().mockReturnValue(true),
    create: jest.fn(),
    bindWorkload: jest.fn().mockImplementation(async (_request, params) => ({
      pluginId: 'agentBuilder',
      workloadType: params.workloadType,
      workloadId: params.workloadId,
      serviceAccountId: params.serviceAccountId,
      spaceId: 'default',
      boundBy: { type: 'user', username: 'alice' },
      boundAt: '2026-01-01T00:00:00.000Z',
    })),
    unbindWorkload: jest.fn().mockResolvedValue(true),
    getWorkloadBinding: jest.fn().mockResolvedValue(null),
    withScopedRequestForWorkload: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<CoreServiceAccountsService>);

describe('assertCanConfigureExecutionIdentity', () => {
  const bindings = { serviceAccounts: createServiceAccounts() };

  it('rejects a change when service accounts are disabled', () => {
    expect.assertions(1);
    try {
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        user: securityOwner,
        bindings: {
          serviceAccounts: createServiceAccounts({
            isEnabled: jest.fn().mockReturnValue(false),
          }),
        },
      });
    } catch (error) {
      expect(isBadRequestError(error)).toBe(true);
    }
  });

  it('refuses an editor without manage_security', () => {
    expect.assertions(1);
    try {
      assertCanConfigureExecutionIdentity({ source: createSource(), user: owner, bindings });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
    }
  });

  it('refuses manage_security without write access to the agent', () => {
    expect.assertions(1);
    try {
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        user: manageSecurityOnly,
        bindings,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
    }
  });

  it('refuses binding the default agent', () => {
    expect.assertions(2);
    try {
      assertCanConfigureExecutionIdentity({
        source: createSource({ id: agentBuilderDefaultAgentId }),
        user: { ...securityOwner, isAdmin: true },
        bindings,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
      expect((error as Error).message).toContain(agentBuilderDefaultAgentId);
    }
  });

  it('allows an editor with manage_security', () => {
    expect(() =>
      assertCanConfigureExecutionIdentity({ source: createSource(), user: securityOwner, bindings })
    ).not.toThrow();
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source: createSource({ service_account_id: 'sa-1' }),
        user: securityOwner,
        bindings,
      })
    ).not.toThrow();
  });
});

describe('assertCanEditBoundAgent', () => {
  it('lets anyone with write access edit an unbound agent', () => {
    expect(() => assertCanEditBoundAgent({ source: createSource(), user: owner })).not.toThrow();
  });

  it('refuses every edit of a bound agent without manage_security', () => {
    expect.assertions(2);
    try {
      assertCanEditBoundAgent({
        source: createSource({ service_account_id: 'sa-1' }),
        user: owner,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
      expect((error as Error).message).toContain('sa-1');
    }
  });

  it('allows edits of a bound agent with manage_security', () => {
    expect(() =>
      assertCanEditBoundAgent({
        source: createSource({ service_account_id: 'sa-1' }),
        user: securityOwner,
      })
    ).not.toThrow();
  });
});

describe('assertCanDeleteBoundAgent', () => {
  it('allows deleting an unbound agent without manage_security', () => {
    expect(() => assertCanDeleteBoundAgent({ source: createSource(), user: owner })).not.toThrow();
  });

  it('refuses to delete a bound agent without manage_security', () => {
    expect.assertions(1);
    try {
      assertCanDeleteBoundAgent({
        source: createSource({ service_account_id: 'sa-1' }),
        user: owner,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
    }
  });

  it('allows deleting a bound agent with manage_security', () => {
    expect(() =>
      assertCanDeleteBoundAgent({
        source: createSource({ service_account_id: 'sa-1' }),
        user: securityOwner,
      })
    ).not.toThrow();
  });
});

describe('unbindDeletedAgent', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();

  it('does nothing for an unbound agent', async () => {
    const serviceAccounts = createServiceAccounts();
    await unbindDeletedAgent({
      bindings: { serviceAccounts },
      request,
      logger,
      source: createSource(),
    });
    expect(serviceAccounts.unbindWorkload).not.toHaveBeenCalled();
  });

  it('skips Core when service accounts are disabled', async () => {
    const serviceAccounts = createServiceAccounts({
      isEnabled: jest.fn().mockReturnValue(false),
    });
    await unbindDeletedAgent({
      bindings: { serviceAccounts },
      request,
      logger,
      source: createSource({ service_account_id: 'sa-1' }),
    });
    expect(serviceAccounts.unbindWorkload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('sa-1'));
  });

  it('unbinds the deleted agent', async () => {
    const serviceAccounts = createServiceAccounts();
    await unbindDeletedAgent({
      bindings: { serviceAccounts },
      request,
      logger,
      source: createSource({ service_account_id: 'sa-1' }),
    });
    expect(serviceAccounts.unbindWorkload).toHaveBeenCalledWith(request, {
      workloadType: AGENT_WORKLOAD_TYPE,
      workloadId: 'agent-1',
    });
  });
});

describe('resolveAgentWorkloads', () => {
  const createStorage = (hits: Array<{ _source: Partial<AgentProperties> }>) => {
    const search = jest.fn().mockResolvedValue({ hits: { hits } });
    return { storage: { getClient: () => ({ search }) } as unknown as AgentProfileStorage, search };
  };

  it('returns nothing for no workloads without searching', async () => {
    const { storage, search } = createStorage([]);
    await expect(resolveAgentWorkloads({ storage, workloads: [] })).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('maps each workload to its agent title and page, in order', async () => {
    const { storage } = createStorage([
      { _source: { id: 'agent-2', name: 'Second', space: 'default' } },
      { _source: { id: 'agent-1', name: 'First', space: 'other' } },
    ]);

    await expect(
      resolveAgentWorkloads({
        storage,
        workloads: [
          { workloadId: 'agent-1', spaceId: 'other' },
          { workloadId: 'missing', spaceId: 'default' },
          { workloadId: 'agent-2', spaceId: 'default' },
        ],
      })
    ).resolves.toEqual([
      { title: 'First', path: '/app/agent_builder/agents/agent-1/overview' },
      undefined,
      { title: 'Second', path: '/app/agent_builder/agents/agent-2/overview' },
    ]);
  });
});
