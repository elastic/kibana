/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callKibana, definePodPlugin, podContract } from '@kbn/task-manager-plugin/server/task_pod';
import type { PodContractHandlers } from '@kbn/task-manager-plugin/server';
import { POD_CONTRACT_PREFIX } from '.';

const CONTRACT = `${POD_CONTRACT_PREFIX}.encryptedSavedObjects`;

/**
 * `PluginStart('encryptedSavedObjects')` in a pod. Decryption happens in Kibana, so a pod never
 * holds the encryption key: it asks for a point-in-time finder and pages through it, and the
 * decrypted documents come back over the run's callback channel like the task's own API key.
 */
export const encryptedSavedObjectsPodPlugin = definePodPlugin({
  id: 'encryptedSavedObjects',
  // `registerType` is a no-op: the types are registered with the real service in Kibana.
  setup: () => ({ registerType: () => undefined, canEncrypt: true }),
  start: () =>
    podContract('encryptedSavedObjects', {
      getClient: (clientOptions?: unknown) =>
        podContract('encryptedSavedObjects.client', {
          createPointInTimeFinderDecryptedAsInternalUser: async (findOptions: unknown) => {
            const finderId = await callKibana<string>(CONTRACT, 'openFinder', [
              clientOptions,
              findOptions,
            ]);
            return {
              find: async function* find() {
                for (;;) {
                  const page = await callKibana<unknown | null>(CONTRACT, 'nextPage', [finderId]);
                  if (page === null) return;
                  yield page;
                }
              },
              close: async () => {
                await callKibana(CONTRACT, 'closeFinder', [finderId]);
              },
            };
          },
        }),
    }),
});

interface OpenFinder {
  iterator: AsyncIterator<unknown>;
  close: () => Promise<void>;
}

export const createEncryptedSavedObjectsHandlers = (
  getService: () => {
    getClient: (options?: never) => {
      createPointInTimeFinderDecryptedAsInternalUser: (options: never) => Promise<{
        find: () => AsyncGenerator<unknown>;
        close: () => Promise<void>;
      }>;
    };
  }
): PodContractHandlers => {
  const finders = new Map<string, OpenFinder>();
  let nextId = 0;

  const release = async (finderId: string) => {
    const finder = finders.get(finderId);
    finders.delete(finderId);
    await finder?.close();
  };

  return {
    openFinder: async (ctx, clientOptions, findOptions) => {
      const finder = await getService()
        .getClient(clientOptions as never)
        .createPointInTimeFinderDecryptedAsInternalUser(findOptions as never);
      const finderId = `${ctx.executionUuid}:${nextId++}`;
      finders.set(finderId, { iterator: finder.find(), close: () => finder.close() });
      // A pod that dies mid-iteration must not leave a point-in-time open.
      ctx.onRunEnd(() => release(finderId));
      return finderId;
    },
    nextPage: async (_ctx, finderId) => {
      const finder = finders.get(finderId as string);
      if (!finder) return null;
      const { value, done } = await finder.iterator.next();
      if (done) {
        await release(finderId as string);
        return null;
      }
      return value;
    },
    closeFinder: async (_ctx, finderId) => release(finderId as string),
  };
};
