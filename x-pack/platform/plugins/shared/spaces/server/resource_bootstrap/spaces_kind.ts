/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { applyEach, createSavedObjectOwnership } from '@kbn/resource-bootstrap-server';
import type { ResourceKind } from '@kbn/resource-bootstrap-server';

import type { InternalSpacesClient } from './create_internal_spaces_client';
import type { spaceV1 as v1 } from '../../common';
import { getSpaceSchema } from '../lib/space_schema';

export const SPACE_KIND_ID = 'space';

const SPACE_SAVED_OBJECT_TYPE = 'space';

type DeclaredSpace = TypeOf<ReturnType<typeof getSpaceSchema>>;

// Validated values are read-only, while the client takes plain arrays.
const toSpace = (declared: DeclaredSpace): v1.Space => ({
  ...declared,
  id: brandSpaceId(declared.id),
  disabledFeatures: [...declared.disabledFeatures],
});

const spaceExists = (client: InternalSpacesClient, id: string): Promise<boolean> =>
  client.get(id).then(
    () => true,
    (error) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  );

/**
 * Spaces declared as the `POST /api/spaces/space` body. Like other owned kinds, a space the
 * bootstrap did not create is never taken over, but one it owns is never pruned: its ownership has
 * no `remove`, since deleting a space deletes every object inside it.
 */
export const createSpacesKind = ({
  getSpacesClient,
  getSavedObjectsClient,
  isServerless,
  onCreated,
}: {
  getSpacesClient: () => Promise<InternalSpacesClient>;
  /** A client that can read the hidden `space` type, to tell whether a space changed. */
  getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  isServerless: boolean;
  /** Runs after a space is created, as `POST /api/spaces/space` does after its create. */
  onCreated?: (space: v1.Space) => Promise<void>;
}): ResourceKind<DeclaredSpace> => ({
  id: SPACE_KIND_ID,
  spaces: 'none',
  parse: (document) => getSpaceSchema(isServerless).validate(document),
  idOf: ({ id }) => id,
  apply: async ({ resources, signal }) => {
    const client = await getSpacesClient();
    return applyEach({
      resources,
      signal,
      idOf: ({ id }) => id,
      write: async (space) => {
        if (await spaceExists(client, space.id)) {
          await client.update(space.id, toSpace(space));
        } else {
          const created = await client.create(toSpace(space));
          await onCreated?.(created);
        }
      },
    });
  },
  ownership: {
    // Spaces are global, so the space the bootstrap passes is ignored.
    versions: createSavedObjectOwnership({
      type: SPACE_SAVED_OBJECT_TYPE,
      shareable: false,
      getClient: getSavedObjectsClient,
    }).versions,
  },
  // Lets the bootstrap warn about resources applied into a space that does not exist.
  spaceExists: async (spaceId) => spaceExists(await getSpacesClient(), spaceId),
});
