/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SecretsUnavailableError } from '@kbn/secrets';
import type { SecretsClient } from './client/types';
import { SecretsPlugin } from './plugin';
import { SECRET_SAVED_OBJECT_TYPE } from './saved_objects/secret_saved_object';

const VALUE = 'correct-horse-battery-staple';

const operations: Array<[keyof SecretsClient, (client: SecretsClient) => Promise<unknown>]> = [
  ['list', (client) => client.list()],
  ['create', (client) => client.create({ name: 'github_token', value: VALUE })],
  ['update', (client) => client.update({ name: 'github_token', value: VALUE })],
  ['delete', (client) => client.delete({ name: 'github_token' })],
];

describe('SecretsPlugin without an encryption key', () => {
  const setup = () => {
    const plugin = new SecretsPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createSetup({ canEncrypt: false }),
    });
    const { getClient } = plugin.start(coreMock.createStart(), {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    return { coreSetup, client: getClient({ request: httpServerMock.createKibanaRequest() }) };
  };

  it('still registers the secret type, so that migrations and checks see it', () => {
    const { coreSetup } = setup();

    expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: SECRET_SAVED_OBJECT_TYPE })
    );
  });

  it.each(operations)('fails %s and says how to fix it', async (_, operation) => {
    const { client } = setup();

    await expect(operation(client)).rejects.toThrow(SecretsUnavailableError);
    await expect(operation(client)).rejects.toThrow('xpack.encryptedSavedObjects.encryptionKey');
  });
});
