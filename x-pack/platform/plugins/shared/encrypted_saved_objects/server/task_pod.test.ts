/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { EncryptedSavedObjectsService } from './crypto';
import { createCryptos } from './crypto/create_cryptos';
import { podPlugins } from './task_pod';

const KEY = 'a'.repeat(32);
const TYPE = 'secret-type';

const buildPod = async (podKey: string | undefined) => {
  const [plugin] = podPlugins;
  const logger = loggingSystemMock.createLogger();
  const context = {
    opaqueId: Symbol('encryptedSavedObjects'),
    logger: { get: () => logger },
    config: {
      get: <T>() =>
        ({ encryptionKey: podKey, keyRotation: { decryptionOnlyKeys: [] } } as unknown as T),
    },
    env: {
      packageInfo: { version: '1.0.0', buildFlavor: 'traditional', branch: 'main', dist: true },
    },
    node: { roles: { backgroundTasks: true, ui: false, migrator: false } },
  };

  // What the host hands a plugin: the saved objects setup/start surface the ESO client reads.
  const encrypted = await encryptWithKibanaKey({ secret: 'hunter2', visible: 'v' });
  const internalRepository = {
    createPointInTimeFinder: () => ({
      find: async function* find() {
        yield {
          saved_objects: [
            { type: TYPE, id: 'doc-1', namespaces: ['default'], attributes: encrypted },
          ],
        };
      },
      close: async () => undefined,
    }),
  };
  const typeRegistry = { isSingleNamespace: () => true };
  const coreStart = {
    savedObjects: {
      createInternalRepository: () => internalRepository,
      getTypeRegistry: () => typeRegistry,
    },
    security: { authc: { getCurrentUser: () => null } },
  };
  const core = {
    savedObjects: { setEncryptionExtension: jest.fn() },
    getStartServices: async () => [coreStart, {}, {}],
  };

  const setup = plugin.setup!(core, {}, context) as {
    canEncrypt: boolean;
    registerType: (registration: { type: string; attributesToEncrypt: Set<string> }) => void;
  };
  setup.registerType({ type: TYPE, attributesToEncrypt: new Set(['secret']) });
  const start = plugin.start!(coreStart, {}, context) as {
    getClient: () => {
      createPointInTimeFinderDecryptedAsInternalUser: (options: unknown) => Promise<{
        find: () => AsyncGenerator<{ saved_objects: Array<Record<string, unknown>> }>;
      }>;
    };
    isEncryptionError: (error: Error) => boolean;
  };
  return { setup, start, core, logger };
};

/** Encrypts the way Kibana does: the plugin's own service with the Kibana key. */
const encryptWithKibanaKey = async (attributes: Record<string, unknown>) => {
  const service = new EncryptedSavedObjectsService({
    ...createCryptos({ encryptionKey: KEY, keyRotation: { decryptionOnlyKeys: [] } }),
    logger: loggingSystemMock.createLogger(),
  });
  service.registerType({ type: TYPE, attributesToEncrypt: new Set(['secret']) });
  return service.encryptAttributes({ type: TYPE, id: 'doc-1', namespace: undefined }, attributes);
};

const decryptedPages = async (pod: Awaited<ReturnType<typeof buildPod>>) => {
  const finder = await pod.start
    .getClient()
    .createPointInTimeFinderDecryptedAsInternalUser({ type: TYPE });
  const pages = [];
  for await (const page of finder.find()) pages.push(page);
  return pages;
};

describe('encrypted saved objects in a task pod', () => {
  it('decrypts what Kibana encrypted, with the same key, without calling Kibana', async () => {
    const pod = await buildPod(KEY);
    expect(pod.setup.canEncrypt).toBe(true);

    const [page] = await decryptedPages(pod);
    expect(page.saved_objects[0].attributes).toEqual({ secret: 'hunter2', visible: 'v' });
  });

  it('cannot decrypt with another key, and says so with an encryption error', async () => {
    const pod = await buildPod('b'.repeat(32));

    const [page] = await decryptedPages(pod);
    const result = page.saved_objects[0] as { error?: { message: string }; attributes: unknown };
    expect(result.error).toBeDefined();
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });

  it('warns at boot when the pod has no key, and cannot encrypt', async () => {
    const pod = await buildPod(undefined);

    expect(pod.setup.canEncrypt).toBe(false);
    expect(pod.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('encryptionKey is not set')
    );
  });

  it('hands the saved objects layer its encryption extension', async () => {
    const pod = await buildPod(KEY);
    expect(pod.core.savedObjects.setEncryptionExtension).toHaveBeenCalledTimes(1);
  });

  it('only provides what tasks use', async () => {
    const pod = await buildPod(KEY);
    expect(() =>
      (pod.setup as unknown as { createMigration: () => void }).createMigration()
    ).toThrow(/not available in a task pod/);
  });
});
