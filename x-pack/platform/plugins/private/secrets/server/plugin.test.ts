/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { SecretsUnavailableError } from '@kbn/secrets';
import type { SecretsClient } from './client/types';
import { SecretsPlugin } from './plugin';
import { SECRET_SAVED_OBJECT_TYPE } from './saved_objects/secret_saved_object';

const VALUE = 'correct-horse-battery-staple';

const operations: Array<
  [keyof SecretsClient, string, (client: SecretsClient) => Promise<unknown>]
> = [
  ['list', 'secret_find', (client) => client.list()],
  ['create', 'secret_create', (client) => client.create({ name: 'github_token', value: VALUE })],
  ['update', 'secret_update', (client) => client.update({ name: 'github_token', value: VALUE })],
  ['delete', 'secret_delete', (client) => client.delete({ name: 'github_token' })],
];

describe('SecretsPlugin without an encryption key', () => {
  const setup = () => {
    const plugin = new SecretsPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createSetup({ canEncrypt: false }),
    });
    const coreStart = coreMock.createStart();
    const log = jest.fn<void, Parameters<AuditLogger['log']>>();
    jest
      .spyOn(coreStart.security.audit, 'asScoped')
      .mockReturnValue({ log, enabled: true, includeSavedObjectNames: true });
    const { getClient } = plugin.start(coreStart, {
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
    });
    return {
      coreSetup,
      client: getClient({ request: httpServerMock.createKibanaRequest() }),
      auditEvents: () => log.mock.calls.map(([auditEvent]) => auditEvent),
    };
  };

  it('still registers the secret type, so that migrations and checks see it', () => {
    const { coreSetup } = setup();

    expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ name: SECRET_SAVED_OBJECT_TYPE })
    );
  });

  it.each(operations)(
    'fails %s, says how to fix it and records the attempt in the audit log',
    async (_, action, operation) => {
      const { client, auditEvents } = setup();

      const attempt = operation(client);

      await expect(attempt).rejects.toThrow(SecretsUnavailableError);
      await expect(attempt).rejects.toThrow('xpack.encryptedSavedObjects.encryptionKey');
      expect(auditEvents()).toMatchObject([
        { event: { action, outcome: 'failure' }, error: { code: 'SecretsUnavailableError' } },
      ]);
    }
  );
});
