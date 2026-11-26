/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  SECRET_VALUE_MAX_LENGTH,
  SecretAlreadyExistsError,
  SecretConflictError,
  SecretNotFoundError,
  SecretUndecryptableError,
  SecretValidationError,
} from '@kbn/secrets';
import { createSecretsClient } from '../client/secrets_client';
import type { SecretsClient } from '../client/types';
import { SecretsPlugin } from '../plugin';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';
import { createSecretsStorageFactory } from '../storage/saved_objects_secrets_storage';
import type { SecretsPluginStart, SecretsPluginStartDependencies } from '../types';

const DEFAULT_SPACE_ID = 'default';
const OTHER_SPACE_ID = 'team-a';
const VALUE = 'correct-horse-battery-staple';
const NEW_VALUE = 'another-long-secret-value';
const DESCRIPTION = 'Token of the release bot';

type KibanaRoot = ReturnType<typeof createRootWithCorePlugins>;

describe('secrets on Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let root: KibanaRoot;
  let coreStart: Awaited<ReturnType<KibanaRoot['start']>>;
  let secrets: SecretsPluginStart;
  let pluginDependencies: SecretsPluginStartDependencies;

  const getClient = (spaceId = DEFAULT_SPACE_ID): SecretsClient =>
    secrets.getClient({ request: httpServerMock.createKibanaRequest({ spaceId }) });

  /** The storage of a space, built by the factory the plugin uses. */
  const createStorage = (spaceId = DEFAULT_SPACE_ID) =>
    createSecretsStorageFactory({
      savedObjects: coreStart.savedObjects,
      encryptedSavedObjects: pluginDependencies.encryptedSavedObjects,
    })({ spaceId });

  /** The id of the Elasticsearch document of a secret of the default space. */
  const getDocumentId = (name: string): string =>
    `${SECRET_SAVED_OBJECT_TYPE}:${getSecretSavedObjectId({ spaceId: DEFAULT_SPACE_ID, name })}`;

  /** Reads a secret of a space as stored, value included. */
  const getStored = async (name: string, spaceId = DEFAULT_SPACE_ID) =>
    (await createStorage(spaceId).get({ name }))?.entry;

  /**
   * Returns a client of the default space that runs `action` after it has read a secret and
   * before it writes it back, so that `action` races the write.
   */
  const createClientRacedBy = (action: () => Promise<unknown>): SecretsClient => {
    const storage = createStorage();
    const { replace } = storage;
    jest.spyOn(storage, 'replace').mockImplementationOnce(async (params) => {
      await action();
      return replace(params);
    });
    return createSecretsClient({ storage, username: null });
  };

  beforeAll(async () => {
    // Kibana loads the plugin itself. Its start call is the only way to reach its contract.
    const start = jest.spyOn(SecretsPlugin.prototype, 'start');
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
    root = createRootWithCorePlugins({ xpack: { secrets: { enabled: true } } }, { oss: false });
    await root.preboot();
    await root.setup();
    coreStart = await root.start();
    secrets = start.mock.results[0].value;
    [, pluginDependencies] = start.mock.calls[0];
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('creates, lists, updates and deletes a secret, and never returns its value', async () => {
    const client = getClient();
    const name = 'lifecycle_token';

    const created = await client.create({ name, description: DESCRIPTION, value: VALUE });
    const listed = await client.list();
    const updated = await client.update({ name, value: NEW_VALUE });
    await client.delete({ name });

    expect(created).toMatchObject({ name, description: DESCRIPTION });
    expect(listed).toContainEqual(created);
    expect(updated).toMatchObject({ name, description: DESCRIPTION });
    for (const secret of [created, ...listed, updated]) {
      expect(secret).not.toHaveProperty('value');
    }
    expect((await client.list()).map((secret) => secret.name)).not.toContain(name);
  });

  it('stores the value encrypted', async () => {
    const name = 'encrypted_token';
    await getClient().create({ name, value: VALUE });

    const { _source: document } = await coreStart.elasticsearch.client.asInternalUser.get<
      Record<string, { value: string }>
    >({
      index: MAIN_SAVED_OBJECT_INDEX,
      id: getDocumentId(name),
    });

    expect(document?.[SECRET_SAVED_OBJECT_TYPE].value).toEqual(expect.any(String));
    expect(document?.[SECRET_SAVED_OBJECT_TYPE].value).not.toContain(VALUE);
    expect(await getStored(name)).toMatchObject({ value: VALUE });
  });

  it('stores a value of the maximum length made of characters that JSON escapes', async () => {
    const name = 'escaped_value_token';
    const value = '\u0001'.repeat(SECRET_VALUE_MAX_LENGTH);

    await getClient().create({ name, value });

    expect((await getStored(name))?.value).toEqual(value);
  });

  it('refuses a secret that breaks a rule and stores nothing', async () => {
    const name = 'short_value';

    await expect(getClient().create({ name, value: 'short' })).rejects.toThrow(
      SecretValidationError
    );
    expect(await getStored(name)).toBeUndefined();
  });

  it('keeps a name unique in its space but not across spaces', async () => {
    const name = 'shared_name';
    await getClient().create({ name, value: VALUE });

    await expect(getClient().create({ name, value: VALUE })).rejects.toThrow(
      SecretAlreadyExistsError
    );
    await getClient(OTHER_SPACE_ID).create({ name, value: VALUE });
    expect(await getClient(OTHER_SPACE_ID).list()).toEqual([expect.objectContaining({ name })]);
  });

  it('updates and deletes a secret only in its own space', async () => {
    const name = 'space_scoped_token';
    await getClient().create({ name, description: DESCRIPTION, value: VALUE });
    await getClient(OTHER_SPACE_ID).create({ name, value: 'other-space-value' });

    await getClient(OTHER_SPACE_ID).update({ name, description: 'Other', value: NEW_VALUE });

    expect(await getStored(name, OTHER_SPACE_ID)).toMatchObject({
      description: 'Other',
      value: NEW_VALUE,
    });
    expect(await getStored(name)).toMatchObject({ description: DESCRIPTION, value: VALUE });

    await getClient(OTHER_SPACE_ID).delete({ name });

    expect(await getStored(name, OTHER_SPACE_ID)).toBeUndefined();
    expect(await getStored(name)).toMatchObject({ description: DESCRIPTION, value: VALUE });
  });

  it('reports a missing secret as not found', async () => {
    const client = getClient();

    await expect(client.update({ name: 'missing_token', value: VALUE })).rejects.toThrow(
      SecretNotFoundError
    );
    await expect(client.delete({ name: 'missing_token' })).rejects.toThrow(SecretNotFoundError);
  });

  describe('update', () => {
    const createSecret = async (name: string) => {
      const client = getClient();
      const created = await client.create({ name, description: DESCRIPTION, value: VALUE });
      return { client, created };
    };

    it.each([
      ['an update with neither a value nor a description', 'unchanged_token', {}],
      ['a value that breaks a rule', 'invalid_value_token', { value: 'short' }],
    ])('refuses %s and keeps the secret as it was', async (_, name, changes) => {
      const { client } = await createSecret(name);

      await expect(client.update({ name, ...changes })).rejects.toThrow(SecretValidationError);
      expect(await getStored(name)).toMatchObject({ value: VALUE, description: DESCRIPTION });
    });

    it('replaces the value and keeps the description', async () => {
      const { client } = await createSecret('new_value_token');

      await client.update({ name: 'new_value_token', value: NEW_VALUE });

      expect(await getStored('new_value_token')).toMatchObject({
        value: NEW_VALUE,
        description: DESCRIPTION,
      });
    });

    it('replaces the description and keeps the value', async () => {
      const { client } = await createSecret('new_description_token');

      await client.update({ name: 'new_description_token', description: 'Rotated monthly' });

      expect(await getStored('new_description_token')).toMatchObject({
        value: VALUE,
        description: 'Rotated monthly',
      });
    });

    it('clears the description when it is empty', async () => {
      const { client } = await createSecret('cleared_description_token');

      await client.update({ name: 'cleared_description_token', description: '' });

      expect((await getStored('cleared_description_token'))?.description).toBeUndefined();
    });

    it('replaces a value that no longer decrypts, and keeps who created the secret', async () => {
      const name = 'undecryptable_token';
      const { client, created } = await createSecret(name);
      const { createdBy, createdAt } = created;
      // Stands for a value encrypted with a key that Kibana no longer has.
      await coreStart.elasticsearch.client.asInternalUser.update({
        index: MAIN_SAVED_OBJECT_INDEX,
        id: getDocumentId(name),
        doc: { [SECRET_SAVED_OBJECT_TYPE]: { value: 'not-a-ciphertext' } },
        refresh: true,
      });

      await expect(client.update({ name, description: 'Rotated monthly' })).rejects.toThrow(
        SecretUndecryptableError
      );
      const updated = await client.update({ name, value: NEW_VALUE });

      expect(updated).toMatchObject({ createdBy, createdAt });
      expect(await getStored(name)).toMatchObject({ value: NEW_VALUE, description: DESCRIPTION });
    });

    it('keeps who created the secret and records who updated it', async () => {
      const name = 'attributed_token';
      const storage = createStorage();
      await createSecretsClient({ storage, username: 'alice' }).create({ name, value: VALUE });
      const created = await getStored(name);

      await createSecretsClient({ storage, username: 'bob' }).update({ name, value: NEW_VALUE });

      expect(await getStored(name)).toMatchObject({
        createdBy: 'alice',
        createdAt: created?.createdAt,
        updatedBy: 'bob',
      });
    });

    it('reports a secret deleted during the update as not found', async () => {
      const name = 'deleted_during_update_token';
      await createSecret(name);
      const client = createClientRacedBy(() => getClient().delete({ name }));

      await expect(client.update({ name, value: NEW_VALUE })).rejects.toThrow(SecretNotFoundError);
      expect(await getStored(name)).toBeUndefined();
    });

    it('refuses to overwrite a secret changed during the update', async () => {
      const name = 'changed_during_update_token';
      await createSecret(name);
      const client = createClientRacedBy(() =>
        getClient().update({ name, description: 'Changed meanwhile' })
      );

      await expect(client.update({ name, value: NEW_VALUE })).rejects.toThrow(SecretConflictError);
      expect(await getStored(name)).toMatchObject({
        value: VALUE,
        description: 'Changed meanwhile',
      });
    });
  });
});
