/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import {
  type ISavedObjectsPointInTimeFinder,
  type ISavedObjectsRepository,
  type ISavedObjectTypeRegistry,
  type Logger,
  type SavedObject,
  type SavedObjectsBaseOptions,
  type SavedObjectsCreatePointInTimeFinderDependencies,
  type SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsErrorHelpers,
  type SavedObjectsServiceSetup,
  type StartServicesAccessor,
} from '@kbn/core/server';
import { errorContent } from '@kbn/core-saved-objects-server';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsClientOptions,
} from '@kbn/encrypted-saved-objects-shared';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { getDescriptorNamespace, normalizeNamespace } from './get_descriptor_namespace';
import { SavedObjectsEncryptionExtension } from './saved_objects_encryption_extension';
import type { EncryptedSavedObjectsService } from '../crypto';

export { normalizeNamespace };
export type { EncryptedSavedObjectsClient, EncryptedSavedObjectsClientOptions };

interface SetupSavedObjectsParams {
  service: PublicMethodsOf<EncryptedSavedObjectsService>;
  savedObjects: SavedObjectsServiceSetup;
  getStartServices: StartServicesAccessor;
  logger: Logger;
}

// This is based off of the SavedObjectsErrorHelpers.createUnsupportedTypeError function
// But uses a custom 'reason' aka message
export const createUnsupportedEncryptedTypeError = (type: string) =>
  SavedObjectsErrorHelpers.decorateBadRequestError(
    new Error('Bad Request'),
    `Type '${type}' is not registered as an encrypted type`
  );

export type ClientInstanciator = (
  options?: EncryptedSavedObjectsClientOptions
) => EncryptedSavedObjectsClient;

export function setupSavedObjects({
  service,
  savedObjects,
  getStartServices,
  logger,
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
          logger.error(
            `getDecryptedAsInternalUser called with non-encrypted type: ${savedObject.type}`
          );
          throw createUnsupportedEncryptedTypeError(savedObject.type);
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
        const unsupportedTypes = (
          Array.isArray(findOptions.type) ? findOptions.type : [findOptions.type]
        ).filter((t) => !service.isRegistered(t));

        if (unsupportedTypes.length) {
          logger.error(
            `createPointInTimeFinderDecryptedAsInternalUser called with non-encrypted types: ${unsupportedTypes.join(
              ', '
            )}`
          );
        }

        const [internalRepository, typeRegistry] = await internalRepositoryAndTypeRegistryPromise;
        const finder = internalRepository.createPointInTimeFinder<T, A>(findOptions, dependencies);
        const finderAsyncGenerator = finder.find();

        async function* encryptedFinder() {
          for await (const res of finderAsyncGenerator) {
            const encryptedSavedObjects = await pMap(
              res.saved_objects,
              async (savedObject) => {
                if (!service.isRegistered(savedObject.type)) {
                  return {
                    ...savedObject,
                    error: errorContent(createUnsupportedEncryptedTypeError(savedObject.type)),
                  };
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
