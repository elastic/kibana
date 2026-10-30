/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { ApiClientFixture, ApiClientResponse, EsClient, KbnClient } from '@kbn/scout';

/**
 * People the object-level security suites act as. Everyone except `reader`, `noActions`, `somAll`
 * and `admin` has the same connector privileges, so only the ACL separates them.
 */
export const USER_PERSONAS = [
  'owner',
  'grantee',
  'stranger',
  'reader',
  'noActions',
  'somAll',
  'admin',
] as const;
export type UserPersona = (typeof USER_PERSONAS)[number];
export type Persona = UserPersona | 'ownerKeyRead';

export interface Principal {
  type: 'user' | 'service_account';
  id: string;
}

export interface OlsTestContext {
  spaceId: string;
  /** Names of the roles the personas have, for credentials a test creates itself. */
  roles: { actionsAll: string; actionsRead: string; noActions: string; somAll: string };
  /** Request headers for a persona, including its credentials. */
  headers: (persona: Persona) => Record<string, string>;
  /** Profile principal of a user persona. */
  principal: (persona: UserPersona) => Principal;
  /** Prefixes a path with the test space. */
  path: (path: string) => string;
  /** Sends requests as personas through a test's API client. */
  api: (apiClient: ApiClientFixture) => OlsApi;
  cleanup: () => Promise<void>;
}

export interface OlsApi {
  request: (
    persona: Persona,
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: unknown
  ) => Promise<ApiClientResponse>;
  /** Creates a `.server-log` connector and returns its ID. */
  createConnector: (
    persona: Persona,
    accessControl?: AccessControl,
    id?: string
  ) => Promise<string>;
  /** Replaces a connector's access through the access control API, as its owner. */
  setAccess: (id: string, accessControl: AccessControl, persona?: Persona) => Promise<void>;
}

export interface AccessControl {
  general_access: 'none' | 'use' | 'edit';
  entries?: Array<Principal & { access: 'use' }>;
}

const BASE_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

/**
 * Creates a space with users at every privilege level, activates their profiles so they can
 * receive grants, and creates a restricted API key for the owner.
 */
export const createOlsTestContext = async ({
  apiClient,
  esClient,
  kbnClient,
}: {
  apiClient: ApiClientFixture;
  esClient: EsClient;
  kbnClient: KbnClient;
}): Promise<OlsTestContext> => {
  const suffix = randomUUID().slice(0, 8);
  const spaceId = `ols-${suffix}`;
  const password = randomUUID();
  const roles = {
    actionsAll: `ols-actions-all-${suffix}`,
    actionsRead: `ols-actions-read-${suffix}`,
    noActions: `ols-no-actions-${suffix}`,
    somAll: `ols-som-all-${suffix}`,
  };
  const usernames = Object.fromEntries(
    USER_PERSONAS.map((persona) => [persona, `ols-${persona.toLowerCase()}-${suffix}`])
  ) as Record<UserPersona, string>;

  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/space',
    body: { id: spaceId, name: spaceId },
  });

  const putRole = (name: string, feature: Record<string, string[]>, spaces = [spaceId]) =>
    kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${name}`,
      body: { elasticsearch: { cluster: [] }, kibana: [{ base: [], feature, spaces }] },
    });
  await putRole(roles.actionsAll, {
    actions: ['all'],
    stackAlerts: ['all'],
    workflowsManagement: ['all'],
  });
  await putRole(roles.actionsRead, { actions: ['read'] });
  await putRole(roles.noActions, { discover: ['read'] });
  await putRole(roles.somAll, { actions: ['all'], savedObjectsManagement: ['all'] }, ['*']);

  const userRoles: Record<UserPersona, string[]> = {
    owner: [roles.actionsAll],
    grantee: [roles.actionsAll],
    stranger: [roles.actionsAll],
    reader: [roles.actionsRead],
    noActions: [roles.noActions],
    somAll: [roles.somAll],
    admin: ['superuser'],
  };

  const headers: Record<string, Record<string, string>> = {};
  const principals = {} as Record<UserPersona, Principal>;
  for (const persona of USER_PERSONAS) {
    await esClient.security.putUser({
      username: usernames[persona],
      password,
      roles: userRoles[persona],
      full_name: `OLS ${persona}`,
      email: `${persona}-${suffix}@example.com`,
    });
    headers[persona] = {
      ...BASE_HEADERS,
      Authorization: `Basic ${Buffer.from(`${usernames[persona]}:${password}`).toString('base64')}`,
    };
    // Activating the profile is what lets a user receive grants.
    const profile = await apiClient.get('internal/security/user_profile', {
      headers: headers[persona],
      responseType: 'json',
    });
    principals[persona] = { type: 'user', id: profile.body.uid };
  }

  // A key the owner created that may only read connectors: it matches the owner's grants, and its
  // own privileges still cap what it can do.
  const ownerKey = await esClient.security.grantApiKey({
    grant_type: 'password',
    username: usernames.owner,
    password,
    api_key: {
      name: `ols-owner-read-${suffix}`,
      role_descriptors: {
        actions_read: {
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: ['feature_actions.read'],
              resources: [`space:${spaceId}`],
            },
          ],
        },
      },
    },
  });
  headers.ownerKeyRead = { ...BASE_HEADERS, Authorization: `ApiKey ${ownerKey.encoded}` };

  const path = (relativePath: string) => `s/${spaceId}/${relativePath.replace(/^\/+/, '')}`;
  const api = (client: ApiClientFixture): OlsApi => {
    const request: OlsApi['request'] = (persona, method, relativePath, body) =>
      client[method](path(relativePath), {
        headers: headers[persona],
        responseType: 'json',
        ...(body !== undefined && { body }),
      });

    const createConnector: OlsApi['createConnector'] = async (persona, accessControl, id) => {
      const response = await request(
        persona,
        'post',
        `api/actions/connector${id ? `/${id}` : ''}`,
        {
          name: `ols ${persona} ${randomUUID().slice(0, 4)}`,
          connector_type_id: '.server-log',
          config: {},
          secrets: {},
          ...(accessControl && { access_control: accessControl }),
        }
      );
      if (response.statusCode !== 200) {
        throw new Error(`Connector creation failed: ${JSON.stringify(response.body)}`);
      }
      return response.body.id;
    };

    const setAccess: OlsApi['setAccess'] = async (id, accessControl, persona = 'owner') => {
      const accessPath = `internal/security/access_control/action/${id}`;
      const { body: state } = await request(persona, 'get', accessPath);
      const response = await request(persona, 'put', accessPath, {
        version: state.version,
        general_access: accessControl.general_access,
        entries: accessControl.entries ?? [],
      });
      if (response.statusCode !== 200) {
        throw new Error(`Access change failed: ${JSON.stringify(response.body)}`);
      }
    };

    return { request, createConnector, setAccess };
  };

  return {
    spaceId,
    roles,
    headers: (persona) => headers[persona],
    principal: (persona) => principals[persona],
    path,
    api,
    cleanup: async () => {
      await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
      for (const username of Object.values(usernames)) {
        await esClient.security.deleteUser({ username });
      }
      for (const role of Object.values(roles)) {
        await esClient.security.deleteRole({ name: role });
      }
      await esClient.security.invalidateApiKey({ name: `ols-owner-read-${suffix}` });
    },
  };
};
