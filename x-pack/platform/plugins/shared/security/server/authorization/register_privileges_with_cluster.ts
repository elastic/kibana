/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, isEqual, isEqualWith } from 'lodash';
import { performance } from 'perf_hooks';

import type { IClusterClient, Logger } from '@kbn/core/server';
import type { PrivilegesService } from '@kbn/security-authorization-core';

import { serializePrivileges } from './privileges_serializer';
import { securityTelemetry } from '../otel/instrumentation';

/**
 * Upper bound, in URL-encoded bytes, for the privilege names sent in a single delete request.
 */
export const DELETE_PRIVILEGES_BATCH_MAX_BYTES = 2048;

// Separator the client puts between names once it encodes the path (`,` becomes `%2C`).
const ENCODED_NAME_SEPARATOR_BYTES = encodeURIComponent(',').length;

// Names go in the URL path, and Elasticsearch rejects request lines over
// `http.max_initial_line_length` (4 KB by default). Feature IDs have no length limit, so we
// budget by encoded bytes instead of by name count. A name that blows the budget on its own
// still gets its own batch, which fails the same way a single-name delete would.
const batchPrivilegeNames = (names: string[]): string[][] => {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentBatchBytes = 0;

  for (const name of names) {
    const nameBytes = encodeURIComponent(name).length;
    const bytesWithName =
      currentBatch.length === 0
        ? nameBytes
        : currentBatchBytes + ENCODED_NAME_SEPARATOR_BYTES + nameBytes;

    if (currentBatch.length > 0 && bytesWithName > DELETE_PRIVILEGES_BATCH_MAX_BYTES) {
      batches.push(currentBatch);
      currentBatch = [name];
      currentBatchBytes = nameBytes;
    } else {
      currentBatch.push(name);
      currentBatchBytes = bytesWithName;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

export async function registerPrivilegesWithCluster(
  logger: Logger,
  privileges: PrivilegesService,
  application: string,
  clusterClient: IClusterClient
) {
  const startTime = performance.now();

  const arePrivilegesEqual = (
    existingPrivileges: Record<string, unknown>,
    expectedPrivileges: Record<string, unknown>
  ) => {
    // when comparing privileges, the order of the actions doesn't matter, lodash's isEqual
    // doesn't know how to compare Sets
    return isEqualWith(existingPrivileges, expectedPrivileges, (value, other, key) => {
      if (key === 'actions' && Array.isArray(value) && Array.isArray(other)) {
        // Array.sort() is in-place, and we don't want to be modifying the actual order
        // of the arrays permanently, and there's potential they're frozen, so we're copying
        // before comparing.
        return isEqual([...value].sort(), [...other].sort());
      }

      // Lodash types aren't correct, `undefined` should be supported as a return value here and it
      // has special meaning.
      return undefined as any;
    });
  };

  const getPrivilegesToDelete = (
    existingPrivileges: Record<string, object>,
    expectedPrivileges: Record<string, object>
  ) => {
    if (Object.keys(existingPrivileges).length === 0) {
      return [];
    }

    return difference(
      Object.keys(existingPrivileges[application]),
      Object.keys(expectedPrivileges[application])
    );
  };

  const expectedPrivileges = serializePrivileges(application, privileges.get());

  logger.debug(`Registering Kibana Privileges with Elasticsearch for ${application}`);

  try {
    // we only want to post the privileges when they're going to change as Elasticsearch has
    // to clear the role cache to get these changes reflected in the _has_privileges API
    const existingPrivileges = await clusterClient.asInternalUser.security.getPrivileges({
      application,
    });
    if (arePrivilegesEqual(existingPrivileges, expectedPrivileges)) {
      logger.debug(`Kibana Privileges already registered with Elasticsearch for ${application}`);
      return;
    }

    const privilegesToDelete = getPrivilegesToDelete(existingPrivileges, expectedPrivileges);
    // Names another instance already deleted come back with `found: false`, so we count from the
    // responses instead of from `privilegesToDelete`.
    let deletedPrivileges = 0;
    for (const batch of batchPrivilegeNames(privilegesToDelete)) {
      const names = batch.join(', ');
      logger.debug(`Deleting Kibana Privileges ${names} from Elasticsearch for ${application}`);
      try {
        // A 404 means none of these privileges exist anymore, usually because another Kibana
        // instance deleted them first. That's the state we want, so it isn't an error.
        const response = await clusterClient.asInternalUser.security.deletePrivileges(
          { application, name: batch },
          { ignore: [404] }
        );
        deletedPrivileges += Object.values(response?.[application] ?? {}).filter(
          ({ found }) => found
        ).length;
      } catch (err) {
        logger.error(`Error deleting Kibana Privileges ${names}`);
        throw err;
      }
    }

    await clusterClient.asInternalUser.security.putPrivileges({ body: expectedPrivileges });
    logger.debug(`Updated Kibana Privileges with Elasticsearch for ${application}`);

    securityTelemetry.recordPrivilegeRegistrationDuration(performance.now() - startTime, {
      application,
      outcome: 'success',
      deletedPrivileges,
    });
  } catch (err) {
    logger.error(
      `Error registering Kibana Privileges with Elasticsearch for ${application}: ${err.message}`
    );

    securityTelemetry.recordPrivilegeRegistrationDuration(performance.now() - startTime, {
      application,
      outcome: 'failure',
    });

    throw err;
  }
}
