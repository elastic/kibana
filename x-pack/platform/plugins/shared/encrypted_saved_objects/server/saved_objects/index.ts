/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import type {
  ISavedObjectsPointInTimeFinder,
  ISavedObjectsRepository,
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsServiceSetup,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { getDescriptorNamespace, normalizeNamespace } from './get_descriptor_namespace';
import { SavedObjectsEncryptionExtension } from './saved_objects_encryption_extension';
import type { EncryptedSavedObjectsService } from '../crypto';

export { normalizeNamespace };

interface SetupSavedObjectsParams {
  service: PublicMethodsOf<EncryptedSavedObjectsService>;
  savedObjects: SavedObjectsServiceSetup;
  getStartServices: StartServicesAccessor;
}

export type ClientInstanciator = (
  options?: EncryptedSavedObjectsClientOptions
) => EncryptedSavedObjectsClient;

export interface EncryptedSavedObjectsClientOptions {
  includedHiddenTypes?: string[];
}

export interface EncryptedSavedObjectsClient {
  getDecryptedAsInternalUser: <T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ) => Promise<SavedObject<T>>;

  /**
   * API method, that can be used to help page through large sets of saved objects and returns decrypted properties in result SO.
   * Its interface matches interface of the corresponding Saved Objects API `createPointInTimeFinder` method:
   *
   * @example
   * ```ts
   * const finder = await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser({
   *   filter,
   *   type: 'my-saved-object-type',
   *   perPage: 1000,
   * });
   * for await (const response of finder.find()) {
   *   // process response
   * }
   * ```
   *
   * @param findOptions matches interface of corresponding argument of Saved Objects API `createPointInTimeFinder` {@link SavedObjectsCreatePointInTimeFinderOptions}
   * @param dependencies matches interface of corresponding argument of Saved Objects API `createPointInTimeFinder` {@link SavedObjectsCreatePointInTimeFinderDependencies}
   *
   */
  createPointInTimeFinderDecryptedAsInternalUser<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ): Promise<ISavedObjectsPointInTimeFinder<T, A>>;
}

export function setupSavedObjects({
  service,
  savedObjects,
  getStartServices,
}: SetupSavedObjectsParams): ClientInstanciator {
  // Register custom saved object extension that will encrypt, decrypt and strip saved object
  // attributes where appropriate for any saved object repository request.
  savedObjects.setEncryptionExtension(({ typeRegistry: baseTypeRegistry, request }) => {
    return new SavedObjectsEncryptionExtension({
      baseTypeRegistry,
      service,
      getCurrentUser: async () => {
        const [{ security }] = await getStartServices();
        return security.authc.getCurrentUser(request) ?? undefined;
      },
    });
  });

  return (clientOpts) => {
    const internalRepositoryAndTypeRegistryPromise = getStartServices().then(
      ([core]) =>
        [
          core.savedObjects.createInternalRepository(clientOpts?.includedHiddenTypes),
          core.savedObjects.getTypeRegistry(),
        ] as [ISavedObjectsRepository, ISavedObjectTypeRegistry]
    );
    return {
      getDecryptedAsInternalUser: async <T = unknown>(
        type: string,
        id: string,
        options?: SavedObjectsBaseOptions
      ): Promise<SavedObject<T>> => {
        const [internalRepository, typeRegistry] = await internalRepositoryAndTypeRegistryPromise;
        const savedObject = await internalRepository.get(type, id, options);

        if (!service.isRegistered(savedObject.type)) {
          return savedObject as SavedObject<T>;
        }

        return {
          ...savedObject,
          attributes: (await service.decryptAttributes(
            {
              type,
              id,
              namespace: getDescriptorNamespace(typeRegistry, type, savedObject.namespaces),
            },
            savedObject.attributes as Record<string, unknown>
          )) as T,
        };
      },

      createPointInTimeFinderDecryptedAsInternalUser: async <T = unknown, A = unknown>(
        findOptions: SavedObjectsCreatePointInTimeFinderOptions,
        dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
      ): Promise<ISavedObjectsPointInTimeFinder<T, A>> => {
        const [internalRepository, typeRegistry] = await internalRepositoryAndTypeRegistryPromise;
        const finder = internalRepository.createPointInTimeFinder<T, A>(findOptions, dependencies);
        const finderAsyncGenerator = finder.find();

        async function* encryptedFinder() {
          for await (const res of finderAsyncGenerator) {
            const encryptedSavedObjects = await pMap(
              res.saved_objects,
              async (savedObject) => {
                if (!service.isRegistered(savedObject.type)) {
                  return savedObject;
                }

                const descriptor = {
                  type: savedObject.type,
                  id: savedObject.id,
                  namespace: getDescriptorNamespace(
                    typeRegistry,
                    savedObject.type,
                    savedObject.namespaces
                  ),
                };

                try {
                  return {
                    ...savedObject,
                    attributes: (await service.decryptAttributes(
                      descriptor,
                      savedObject.attributes as Record<string, unknown>
                    )) as T,
                  };
                } catch (error) {
                  // catch error and enrich SO with it, return stripped attributes. Then consumer of API can decide either proceed
                  // with only unsecured properties or stop when error happens
                  const { attributes: strippedAttrs } = await service.stripOrDecryptAttributes(
                    descriptor,
                    savedObject.attributes as Record<string, unknown>
                  );
                  return { ...savedObject, attributes: strippedAttrs as T, error };
                }
              },
              { concurrency: 50 }
            );

            yield { ...res, saved_objects: encryptedSavedObjects };
          }
        }

        return { find: () => encryptedFinder(), close: finder.close.bind(finder) };
      },
    };
  };
}
