/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const SECRETS_PATH = 'internal/workflows/secrets';
const INTERNAL_HEADERS = { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' };
const HEADERS = { ...INTERNAL_HEADERS, 'elastic-api-version': '1' };
const VALUE = 'correct-horse-battery-staple';
const NEW_VALUE = 'another-long-secret-value';
const DEFAULT_SPACE = 'default';
const OTHER_SPACE = 'secrets_other_space';
const SPACES = [DEFAULT_SPACE, OTHER_SPACE];
const MANAGE_SECRETS_ACTION = 'api:workflowsManagement:secrets:manage';

/** A role with these Workflows privileges, in these spaces, and nothing else. */
const workflowsRole = (privileges: readonly string[], spaces: readonly string[] = ['*']) => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { workflowsManagement: [...privileges] }, spaces: [...spaces] }],
});

/** Calls the secrets routes of one space with the cookie of one user. */
const secretsRoutes = (
  apiClient: ApiClientFixture,
  {
    cookieHeader,
    spaceId = DEFAULT_SPACE,
  }: { cookieHeader: Record<string, string>; spaceId?: string }
) => {
  const headers = { ...HEADERS, ...cookieHeader };
  const path = `s/${spaceId}/${SECRETS_PATH}`;
  return {
    list: () => apiClient.get(path, { headers, responseType: 'json' }),
    create: (body: Record<string, string>) =>
      apiClient.post(path, { headers, body, responseType: 'json' }),
    update: (name: string, body: Record<string, string>) =>
      apiClient.patch(`${path}/${name}`, { headers, body, responseType: 'json' }),
    remove: (name: string) =>
      apiClient.delete(`${path}/${name}`, { headers, responseType: 'json' }),
  };
};

/** The names of the secrets in a list response. */
const namesIn = ({ body }: { body: { secrets: Array<{ name: string }> } }) =>
  body.secrets.map(({ name }) => name);

const FORBIDDEN = { list: 403, create: 403, update: 403, remove: 403 };
const LIST_ONLY = { ...FORBIDDEN, list: 200 };
const ALLOWED = { list: 200, create: 201, update: 200, remove: 204 };

const USERS = [
  {
    title: 'a user who can only read workflows can neither list nor change secrets',
    privileges: ['read'],
    statuses: FORBIDDEN,
  },
  {
    title: 'a user who can create workflows lists secrets but cannot change them',
    privileges: ['minimal_read', 'workflow_create'],
    statuses: LIST_ONLY,
  },
  {
    title: 'a user who can update workflows lists secrets but cannot change them',
    privileges: ['minimal_read', 'workflow_update'],
    statuses: LIST_ONLY,
  },
  {
    title: 'a user who can only manage secrets lists and changes them',
    privileges: ['minimal_read', 'workflow_secret_manage'],
    statuses: ALLOWED,
  },
  {
    title: 'a user with all Workflows privileges lists and changes secrets',
    privileges: ['all'],
    statuses: ALLOWED,
  },
] as const;

/** The secret that exists before the test of a user, for that user to try to change. */
const existingSecretOf = (userIndex: number) => `user_${userIndex}_existing`;

apiTest.describe('Workflow secrets routes', { tag: [...tags.stateful.classic] }, () => {
  apiTest.beforeAll(async ({ apiClient, apiServices, samlAuth }) => {
    await apiServices.spaces.create({ id: OTHER_SPACE });
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const secrets = secretsRoutes(apiClient, { cookieHeader });
    for (const index of USERS.keys()) {
      expect(
        await secrets.create({ name: existingSecretOf(index), value: VALUE })
      ).toHaveStatusCode(201);
    }
  });

  apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    for (const spaceId of SPACES) {
      const secrets = secretsRoutes(apiClient, { cookieHeader, spaceId });
      for (const name of namesIn(await secrets.list())) {
        await secrets.remove(name);
      }
    }
    await apiServices.spaces.delete(OTHER_SPACE);
  });

  apiTest('registers the Manage Secrets privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get('api/security/privileges?includeActions=true', {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    const { workflowsManagement } = response.body.features;

    expect(response).toHaveStatusCode(200);
    // Pins the action name that secrets_disabled.spec.ts expects to be missing.
    expect(workflowsManagement.workflow_secret_manage).toContain(MANAGE_SECRETS_ACTION);
    expect(workflowsManagement.all).toContain(MANAGE_SECRETS_ACTION);
  });

  USERS.forEach(({ title, privileges, statuses }, index) => {
    apiTest(title, async ({ apiClient, samlAuth }) => {
      // A worker has one custom role, so each test signs in with its own right before using it.
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(privileges));
      const secrets = secretsRoutes(apiClient, { cookieHeader });
      const existing = existingSecretOf(index);

      expect(await secrets.list()).toHaveStatusCode(statuses.list);
      expect(await secrets.create({ name: `user_${index}_new`, value: VALUE })).toHaveStatusCode(
        statuses.create
      );
      expect(await secrets.update(existing, { description: 'Changed' })).toHaveStatusCode(
        statuses.update
      );
      expect(await secrets.remove(existing)).toHaveStatusCode(statuses.remove);
    });
  });

  apiTest(
    'a user who manages secrets in one space cannot list or change them in another',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        workflowsRole(['minimal_read', 'workflow_secret_manage'], [OTHER_SPACE])
      );
      const ownSpace = secretsRoutes(apiClient, { cookieHeader, spaceId: OTHER_SPACE });
      const otherSpace = secretsRoutes(apiClient, { cookieHeader });
      const name = 'one_space_secret';

      expect(await ownSpace.create({ name, value: VALUE })).toHaveStatusCode(201);
      expect(await otherSpace.list()).toHaveStatusCode(403);
      expect(await otherSpace.create({ name, value: VALUE })).toHaveStatusCode(403);
      expect(await otherSpace.update(existingSecretOf(0), { value: NEW_VALUE })).toHaveStatusCode(
        403
      );
      expect(await otherSpace.remove(existingSecretOf(0))).toHaveStatusCode(403);
    }
  );

  apiTest('keeps a secret in the space it was created in', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const ownSpace = secretsRoutes(apiClient, { cookieHeader, spaceId: OTHER_SPACE });
    const otherSpace = secretsRoutes(apiClient, { cookieHeader });
    const name = 'space_bound_secret';

    expect(await ownSpace.create({ name, value: VALUE })).toHaveStatusCode(201);

    expect(namesIn(await ownSpace.list())).toContain(name);
    expect(namesIn(await otherSpace.list())).not.toContain(name);
    expect(await otherSpace.update(name, { value: NEW_VALUE })).toHaveStatusCode(404);
    expect(await otherSpace.remove(name)).toHaveStatusCode(404);
  });

  apiTest(
    'never returns a value, records the profile of who created and updated a secret, and deletes it',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
      const secrets = secretsRoutes(apiClient, { cookieHeader });
      const me = await apiClient.get('internal/security/me', {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      const { profile_uid: profileId } = me.body;
      const name = 'lifecycle_secret';
      const description = 'Token of the release bot';
      const metadata = { name, description, createdBy: profileId, updatedBy: profileId };

      const created = await secrets.create({ name, description, value: VALUE });
      const updated = await secrets.update(name, { value: NEW_VALUE });
      const listed = await secrets.list();
      const listedSecret = listed.body.secrets.find(
        (secret: { name: string }) => secret.name === name
      );

      expect(me).toHaveStatusCode(200);
      expect(typeof profileId).toBe('string');
      expect(created).toHaveStatusCode(201);
      expect(updated).toHaveStatusCode(200);
      expect(listed).toHaveStatusCode(200);
      for (const secret of [created.body, updated.body, listedSecret]) {
        expect(secret).toMatchObject(metadata);
        expect(secret.value).toBeUndefined();
      }

      expect(await secrets.remove(name)).toHaveStatusCode(204);
      expect(namesIn(await secrets.list())).not.toContain(name);
      expect(await secrets.remove(name)).toHaveStatusCode(404);
    }
  );

  apiTest(
    'reports a broken rule, a name already taken and a missing secret',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const secrets = secretsRoutes(apiClient, { cookieHeader });
      const name = 'taken_secret';

      expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(201);
      expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(409);
      expect(await secrets.create({ name: 'Not_Lowercase', value: VALUE })).toHaveStatusCode(400);
      expect(await secrets.update('missing_secret', { value: NEW_VALUE })).toHaveStatusCode(404);
      expect(await secrets.remove('missing_secret')).toHaveStatusCode(404);
    }
  );

  apiTest('refuses a request that does not match its schema', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const secrets = secretsRoutes(apiClient, { cookieHeader });
    const name = 'schema_secret';

    expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(201);
    expect(await secrets.create({ name: 'valueless_secret' })).toHaveStatusCode(400);
    expect(await secrets.update(name, { name: 'renamed_secret' })).toHaveStatusCode(400);
  });
});
