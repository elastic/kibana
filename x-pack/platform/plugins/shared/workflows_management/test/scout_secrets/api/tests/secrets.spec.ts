/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, getPlaywrightTagsFor } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const SECRETS_PATH = 'internal/workflows/secrets';
const INTERNAL_HEADERS = { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' };
const HEADERS = { ...INTERNAL_HEADERS, 'elastic-api-version': '1' };
const VALUE = 'correct-horse-battery-staple';
const NEW_VALUE = 'another-long-secret-value';
const DEFAULT_SPACE = 'default';
// Unique to this run, so that leftovers of an interrupted run never collide with it.
const RUN_ID = Math.random().toString(36).slice(2, 8);
const OTHER_SPACE = `secrets_other_space_${RUN_ID}`;
/** A secret name unique to this run. */
const unique = (name: string) => `${name}_${RUN_ID}`;
const MANAGE_SECRETS_ACTION = 'api:workflowsManagement:secrets:manage';

/** A role with these Workflows privileges, in these spaces, and nothing else. */
const workflowsRole = (privileges: readonly string[], spaces: readonly string[] = ['*']) => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { workflowsManagement: [...privileges] }, spaces: [...spaces] }],
});

/** The secrets this suite created, so that teardown deletes only those. */
const createdSecrets: Array<{ spaceId: string; name: string }> = [];

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
    create: async (body: Record<string, string>) => {
      const response = await apiClient.post(path, { headers, body, responseType: 'json' });
      if (response.statusCode === 201) {
        createdSecrets.push({ spaceId, name: body.name });
      }
      return response;
    },
    update: (name: string, body: Record<string, string>) =>
      apiClient.patch(`${path}/${name}`, { headers, body, responseType: 'json' }),
    remove: (name: string) =>
      apiClient.delete(`${path}/${name}`, { headers, responseType: 'json' }),
  };
};

/** The names of the secrets in a successful list response. */
const namesIn = (response: { statusCode: number; body: { secrets: Array<{ name: string }> } }) => {
  expect(response).toHaveStatusCode(200);
  return response.body.secrets.map(({ name }) => name);
};

/** The names of the secrets a list response shows, none when the list was refused. */
const visibleNamesIn = (response: {
  statusCode: number;
  body: { secrets: Array<{ name: string }> };
}) => (response.statusCode === 200 ? namesIn(response) : []);

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

// Local only: Elastic Cloud deployments do not boot with the `secrets` config set.
const LOCAL_STATEFUL_CLASSIC = getPlaywrightTagsFor('stateful', 'classic', 'local');

apiTest.describe('Workflow secrets routes', { tag: LOCAL_STATEFUL_CLASSIC }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.create({ id: OTHER_SPACE });
  });

  apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const failures: string[] = [];
    for (const { spaceId, name } of createdSecrets) {
      try {
        const routes = secretsRoutes(apiClient, { cookieHeader, spaceId });
        const { statusCode } = await routes.remove(name);
        // Secrets that a test already deleted answer 404, which is fine here.
        if (statusCode !== 204 && statusCode !== 404) {
          failures.push(`${spaceId}/${name}: ${statusCode}`);
        }
      } catch (error) {
        failures.push(`${spaceId}/${name}: ${String(error)}`);
      }
    }
    await apiServices.spaces.delete(OTHER_SPACE);
    // Checked last, so that one failed deletion does not keep the others from running.
    expect(failures).toStrictEqual([]);
  });

  apiTest('registers the Manage Secrets privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get('api/security/privileges?includeActions=true', {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const { workflowsManagement } = response.body.features;

    // Pins the action name that secrets_disabled.spec.ts expects to be missing.
    expect(workflowsManagement.workflow_secret_manage).toContain(MANAGE_SECRETS_ACTION);
    expect(workflowsManagement.all).toContain(MANAGE_SECRETS_ACTION);
  });

  USERS.forEach(({ title, privileges, statuses }, index) => {
    apiTest(title, async ({ apiClient, samlAuth }) => {
      const existing = unique(`user_${index}_existing`);
      const admin = await samlAuth.asInteractiveUser('admin');
      expect(
        await secretsRoutes(apiClient, admin).create({ name: existing, value: VALUE })
      ).toHaveStatusCode(201);
      // A worker has one custom role, so each test signs in with its own right before using it.
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(privileges));
      const secrets = secretsRoutes(apiClient, { cookieHeader });

      const listed = await secrets.list();
      expect(listed).toHaveStatusCode(statuses.list);
      // A role that may list must also see the secret seeded above.
      expect(visibleNamesIn(listed).includes(existing)).toBe(statuses.list === 200);
      expect(
        await secrets.create({ name: unique(`user_${index}_new`), value: VALUE })
      ).toHaveStatusCode(statuses.create);
      expect(await secrets.update(existing, { description: 'Changed' })).toHaveStatusCode(
        statuses.update
      );
      expect(await secrets.remove(existing)).toHaveStatusCode(statuses.remove);
    });
  });

  apiTest(
    'a user who manages secrets in one space cannot list or change them in another',
    async ({ apiClient, samlAuth }) => {
      const existing = unique('other_space_existing');
      const admin = await samlAuth.asInteractiveUser('admin');
      expect(
        await secretsRoutes(apiClient, admin).create({ name: existing, value: VALUE })
      ).toHaveStatusCode(201);
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        workflowsRole(['minimal_read', 'workflow_secret_manage'], [OTHER_SPACE])
      );
      const ownSpace = secretsRoutes(apiClient, { cookieHeader, spaceId: OTHER_SPACE });
      const otherSpace = secretsRoutes(apiClient, { cookieHeader });
      const name = unique('one_space_secret');

      expect(await ownSpace.create({ name, value: VALUE })).toHaveStatusCode(201);
      expect(await otherSpace.list()).toHaveStatusCode(403);
      expect(await otherSpace.create({ name, value: VALUE })).toHaveStatusCode(403);
      expect(await otherSpace.update(existing, { value: NEW_VALUE })).toHaveStatusCode(403);
      expect(await otherSpace.remove(existing)).toHaveStatusCode(403);
    }
  );

  apiTest('keeps a secret in the space it was created in', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
    const ownSpace = secretsRoutes(apiClient, { cookieHeader, spaceId: OTHER_SPACE });
    const otherSpace = secretsRoutes(apiClient, { cookieHeader });
    const name = unique('space_bound_secret');

    expect(await ownSpace.create({ name, value: VALUE })).toHaveStatusCode(201);

    expect(namesIn(await ownSpace.list())).toContain(name);
    expect(namesIn(await otherSpace.list())).not.toContain(name);
    expect(await otherSpace.update(name, { value: NEW_VALUE })).toHaveStatusCode(404);
    expect(await otherSpace.remove(name)).toHaveStatusCode(404);
    expect(await ownSpace.update(name, { value: NEW_VALUE })).toHaveStatusCode(200);
    expect(await ownSpace.remove(name)).toHaveStatusCode(204);
  });

  apiTest(
    'refuses to list or create secrets in a space that does not exist',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
      const missingSpace = secretsRoutes(apiClient, {
        cookieHeader,
        spaceId: unique('missing_space'),
      });

      expect(await missingSpace.list()).toHaveStatusCode(404);
      expect(
        await missingSpace.create({ name: unique('orphan_secret'), value: VALUE })
      ).toHaveStatusCode(404);
    }
  );

  apiTest(
    'never returns a value, records the profile of who created and updated a secret, saves an update and deletes it',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
      const secrets = secretsRoutes(apiClient, { cookieHeader });
      const me = await apiClient.get('internal/security/me', {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(me).toHaveStatusCode(200);
      const { profile_uid: profileId } = me.body;
      expect(typeof profileId).toBe('string');
      const name = unique('lifecycle_secret');
      const description = 'Token of the release bot';
      const newDescription = 'Token of the deploy bot';
      const profiles = { createdBy: profileId, updatedBy: profileId };

      const created = await secrets.create({ name, description, value: VALUE });
      expect(created).toHaveStatusCode(201);
      const updated = await secrets.update(name, { value: NEW_VALUE, description: newDescription });
      expect(updated).toHaveStatusCode(200);
      const listed = await secrets.list();
      expect(listed).toHaveStatusCode(200);
      const listedSecret = listed.body.secrets.find(
        (secret: { name: string }) => secret.name === name
      );

      expect(created.body).toMatchObject({ name, description, ...profiles });
      // The list reads the stored secret, so it shows that the update was saved.
      for (const secret of [updated.body, listedSecret]) {
        expect(secret).toMatchObject({ name, description: newDescription, ...profiles });
      }
      for (const secret of [created.body, updated.body, listedSecret]) {
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
      const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
      const secrets = secretsRoutes(apiClient, { cookieHeader });
      const name = unique('taken_secret');

      expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(201);
      expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(409);
      expect(await secrets.create({ name: 'Not_Lowercase', value: VALUE })).toHaveStatusCode(400);
      expect(await secrets.remove('Not_Lowercase')).toHaveStatusCode(400);
      const missing = unique('missing_secret');
      expect(await secrets.update(missing, { value: NEW_VALUE })).toHaveStatusCode(404);
      expect(await secrets.remove(missing)).toHaveStatusCode(404);
    }
  );

  apiTest('refuses a request that does not match its schema', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(workflowsRole(['all']));
    const secrets = secretsRoutes(apiClient, { cookieHeader });
    const name = unique('schema_secret');

    expect(await secrets.create({ name, value: VALUE })).toHaveStatusCode(201);
    expect(await secrets.create({ name: 'valueless_secret' })).toHaveStatusCode(400);
    expect(
      await secrets.update(name, { name: 'renamed_secret', description: 'Renamed' })
    ).toHaveStatusCode(400);
  });
});
