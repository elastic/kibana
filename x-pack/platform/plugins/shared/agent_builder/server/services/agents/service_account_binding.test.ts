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
  isInternalError,
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
  withAgentBindingChange,
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

  it('ignores a write that keeps the current identity', () => {
    const source = createSource({ service_account_id: 'sa-1' });
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source,
        currentId: 'sa-1',
        nextId: undefined,
        user: owner,
        bindings,
      })
    ).not.toThrow();
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source,
        currentId: 'sa-1',
        nextId: 'sa-1',
        user: owner,
        bindings,
      })
    ).not.toThrow();
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        currentId: undefined,
        nextId: null,
        user: owner,
        bindings,
      })
    ).not.toThrow();
  });

  it('rejects a change when service accounts are disabled', () => {
    expect.assertions(1);
    try {
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        currentId: undefined,
        nextId: 'sa-1',
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
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        currentId: undefined,
        nextId: 'sa-1',
        user: owner,
        bindings,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
    }
  });

  it('refuses manage_security without write access to the agent', () => {
    expect.assertions(1);
    try {
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        currentId: undefined,
        nextId: 'sa-1',
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
        currentId: undefined,
        nextId: 'sa-1',
        user: { ...securityOwner, isAdmin: true },
        bindings,
      });
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
      expect((error as Error).message).toContain(agentBuilderDefaultAgentId);
    }
  });

  it('allows an editor with manage_security to bind and unbind', () => {
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source: createSource(),
        currentId: undefined,
        nextId: 'sa-1',
        user: securityOwner,
        bindings,
      })
    ).not.toThrow();
    expect(() =>
      assertCanConfigureExecutionIdentity({
        source: createSource({ service_account_id: 'sa-1' }),
        currentId: 'sa-1',
        nextId: null,
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

describe('withAgentBindingChange', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();
  const coordinates = {
    workloadType: AGENT_WORKLOAD_TYPE,
    workloadId: 'agent-1',
    spaceId: 'default',
  };

  const run = ({
    serviceAccounts,
    nextId,
    write,
    readStoredId = async () => undefined,
  }: {
    serviceAccounts: jest.Mocked<CoreServiceAccountsService>;
    nextId: string | undefined;
    write: () => Promise<string>;
    readStoredId?: () => Promise<string | undefined | null>;
  }) =>
    withAgentBindingChange({
      bindings: { serviceAccounts },
      request,
      logger,
      agentId: 'agent-1',
      spaceId: 'default',
      nextId,
      write,
      readStoredId,
    });

  it('binds in Core before the agent is written', async () => {
    const serviceAccounts = createServiceAccounts();
    const calls: string[] = [];
    serviceAccounts.bindWorkload.mockImplementation(async () => {
      calls.push('bind');
      return {} as never;
    });
    const write = jest.fn(async () => {
      calls.push('write');
      return 'written';
    });

    await expect(run({ serviceAccounts, nextId: 'sa-1', write })).resolves.toBe('written');
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith(coordinates);
    expect(serviceAccounts.bindWorkload).toHaveBeenCalledWith(request, {
      workloadType: AGENT_WORKLOAD_TYPE,
      workloadId: 'agent-1',
      serviceAccountId: 'sa-1',
    });
    expect(calls).toEqual(['bind', 'write']);
  });

  it('unbinds when the write removes the account', async () => {
    const serviceAccounts = createServiceAccounts({
      getWorkloadBinding: jest.fn().mockResolvedValue({ serviceAccountId: 'sa-1' }),
    });
    const write = jest.fn(async () => 'written');

    await run({ serviceAccounts, nextId: undefined, write });

    expect(serviceAccounts.unbindWorkload).toHaveBeenCalledWith(request, {
      workloadType: AGENT_WORKLOAD_TYPE,
      workloadId: 'agent-1',
    });
    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
  });

  it('skips Core when the binding already matches', async () => {
    const serviceAccounts = createServiceAccounts({
      getWorkloadBinding: jest.fn().mockResolvedValue({ serviceAccountId: 'sa-1' }),
    });
    const write = jest.fn(async () => 'written');

    await run({ serviceAccounts, nextId: 'sa-1', write });

    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
    expect(serviceAccounts.unbindWorkload).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalled();
  });

  it('removes the new binding when the write fails and nothing is stored', async () => {
    const binding = { serviceAccountId: 'sa-1', workloadId: 'agent-1' };
    const serviceAccounts = createServiceAccounts({
      bindWorkload: jest.fn().mockResolvedValue(binding),
      getWorkloadBinding: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(binding),
    });
    const failure = new Error('write failed');

    await expect(
      run({
        serviceAccounts,
        nextId: 'sa-1',
        write: async () => {
          throw failure;
        },
      })
    ).rejects.toBe(failure);

    expect(serviceAccounts.unbindWorkload).toHaveBeenCalledWith(request, {
      workloadType: AGENT_WORKLOAD_TYPE,
      workloadId: 'agent-1',
    });
  });

  it('rebinds to the stored account when the write fails after an unbind', async () => {
    const serviceAccounts = createServiceAccounts({
      getWorkloadBinding: jest
        .fn()
        .mockResolvedValueOnce({ serviceAccountId: 'sa-1' })
        .mockResolvedValueOnce(null),
    });

    await expect(
      run({
        serviceAccounts,
        nextId: undefined,
        write: async () => {
          throw new Error('write failed');
        },
        readStoredId: async () => 'sa-1',
      })
    ).rejects.toThrow('write failed');

    expect(serviceAccounts.bindWorkload).toHaveBeenCalledWith(request, {
      workloadType: AGENT_WORKLOAD_TYPE,
      workloadId: 'agent-1',
      serviceAccountId: 'sa-1',
    });
  });

  it('leaves a concurrently changed binding alone and reports the write failure', async () => {
    const serviceAccounts = createServiceAccounts({
      bindWorkload: jest.fn().mockResolvedValue({ serviceAccountId: 'sa-1' }),
      getWorkloadBinding: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ serviceAccountId: 'sa-2' }),
    });

    await expect(
      run({
        serviceAccounts,
        nextId: 'sa-1',
        write: async () => {
          throw new Error('write failed');
        },
      })
    ).rejects.toThrow('write failed');

    expect(serviceAccounts.unbindWorkload).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('concurrent change'));
  });

  it('reports an internal error when compensation itself fails', async () => {
    const binding = { serviceAccountId: 'sa-1' };
    const serviceAccounts = createServiceAccounts({
      bindWorkload: jest.fn().mockResolvedValue(binding),
      getWorkloadBinding: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(binding),
      unbindWorkload: jest.fn().mockRejectedValue(new Error('core down')),
    });

    expect.assertions(1);
    try {
      await run({
        serviceAccounts,
        nextId: 'sa-1',
        write: async () => {
          throw new Error('write failed');
        },
      });
    } catch (error) {
      expect(isInternalError(error)).toBe(true);
    }
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
