/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

export interface BuildToolContextOptions {
  /** API privileges the simulated user holds, e.g. ['osquery-writeLiveQueries']. */
  grantedPrivileges?: string[];
  /** When false, RBAC is off for the request and every privilege check passes. */
  rbacEnabled?: boolean;
  spaceId?: string;
  agents?: unknown[];
  agentsTotal?: number;
  packagePolicyIds?: string[];
  agentPolicyIds?: string[];
  installVersion?: string | undefined;
  packagePolicyThrows?: boolean;
  listAgentsThrows?: boolean;
}

/**
 * Minimal Osquery app-context double for Agent Builder tool handlers.
 *
 * The privilege check is modelled on the real one: `checkPrivilegesDynamically`
 * receives `security.authz.actions.api.get(<privilege>)` strings and reports
 * per-entry `authorized`. Tests therefore assert on the actual privilege names
 * the routes declare rather than on a boolean flag.
 */
export const buildToolContext = ({
  grantedPrivileges = [],
  rbacEnabled = true,
  spaceId = 'default',
  agents = [],
  agentsTotal,
  packagePolicyIds = ['pkg-policy-1'],
  agentPolicyIds = ['agent-policy-1'],
  installVersion = '1.13.0',
  packagePolicyThrows = false,
  listAgentsThrows = false,
}: BuildToolContextOptions = {}) => {
  const checkPrivileges = jest
    .fn()
    .mockImplementation(async ({ kibana }: { kibana: string[] }) => ({
      privileges: {
        kibana: kibana.map((privilege) => ({
          privilege,
          // Exact match: substring matching would let `osquery-read` authorize
          // the distinct `osquery-readLiveQueries` privilege.
          authorized: grantedPrivileges.some((granted) => `api:${granted}` === privilege),
        })),
      },
    }));

  const security = {
    authz: {
      mode: { useRbacForRequest: () => rbacEnabled },
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
    },
  };

  const listAgents = jest.fn().mockImplementation(async () => {
    if (listAgentsThrows) {
      throw new Error('Fleet unavailable');
    }

    return { agents, total: agentsTotal ?? agents.length };
  });

  const getByIDs = jest.fn().mockImplementation(async () => {
    if (packagePolicyThrows) {
      throw new Error('package policy lookup failed');
    }

    return agentPolicyIds.map((id, index) => ({
      id: packagePolicyIds[index] ?? `pkg-policy-${index}`,
      policy_ids: [id],
    }));
  });

  const fetchAllItemIds = jest.fn().mockImplementation(async function* () {
    yield packagePolicyIds;
  });

  const savedObjectsClient = {
    find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 }),
    get: jest.fn().mockResolvedValue({ id: 'so-1', attributes: {}, references: [] }),
  };

  const context = {
    experimentalFeatures: { agentBuilderTools: true },
    logFactory: {
      get: () => ({ debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() }),
    },
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: {
              search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
            },
          },
        },
        savedObjects: { getScopedClient: jest.fn().mockReturnValue(savedObjectsClient) },
      },
      { security },
    ]),
    service: {
      getActiveSpace: jest.fn().mockResolvedValue({ id: spaceId }),
      getScopedSavedObjectsClient: jest.fn().mockReturnValue(savedObjectsClient),
      getAgentService: jest
        .fn()
        .mockReturnValue({ asInternalScopedUser: jest.fn().mockReturnValue({ listAgents }) }),
      getPackagePolicyService: jest.fn().mockReturnValue({ getByIDs, fetchAllItemIds }),
      getPackageService: jest.fn().mockReturnValue({
        asInternalUser: {
          getInstallation: jest
            .fn()
            .mockResolvedValue(installVersion ? { install_version: installVersion } : undefined),
        },
      }),
    },
  } as unknown as OsqueryAppContext;

  return {
    context,
    security,
    checkPrivileges,
    listAgents,
    getByIDs,
    savedObjectsClient,
  };
};

export const toolRequest = {} as KibanaRequest;
