/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';

import { DATASET_CLAIMS_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../../common/constants';
import type { InstallSource } from '../../../../../common/types';

import { DatasetClaimConflictError } from './errors';
import { withDatasetOwnershipLock } from './lock';
import { patternsOverlap } from './patterns';

export type DatasetClaimOrigin = 'install' | 'adoption' | 'backfill';

export interface AdoptedStreamBaseline {
  name: string;
  previous_default_pipeline?: string;
}

export interface DatasetClaimAttributes {
  package_name: string;
  status: 'pending' | 'active';
  origin: DatasetClaimOrigin;
  /** Attempt that created this claim. Only that attempt may release it. */
  attempt_id: string;
  /** Every pattern the governing template declares, so uninstall can enumerate all of them. */
  index_patterns: string[];
  package_version?: string;
  install_source?: InstallSource;
  adopted_streams?: AdoptedStreamBaseline[];
}

export interface DatasetClaimRequest {
  baseName: string;
  indexPatterns: string[];
}

const attributesFilter = (field: string, value: string): string =>
  `${DATASET_CLAIMS_SAVED_OBJECT_TYPE}.attributes.${field}:"${value}"`;

const getClaim = async (
  soClient: SavedObjectsClientContract,
  baseName: string
): Promise<DatasetClaimAttributes | undefined> => {
  try {
    return (await soClient.get<DatasetClaimAttributes>(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName))
      .attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) return undefined;
    throw error;
  }
};

/** Rejects a write whose index patterns overlap a claim owned by a different package. */
export const assertNoOverlappingForeignClaims = async (
  soClient: SavedObjectsClientContract,
  packageName: string,
  claims: DatasetClaimRequest[]
): Promise<void> => {
  const existingClaims =
    (
      await soClient.find<DatasetClaimAttributes>({
        type: DATASET_CLAIMS_SAVED_OBJECT_TYPE,
        perPage: SO_SEARCH_LIMIT,
      })
    )?.saved_objects ?? [];

  for (const { baseName, indexPatterns } of claims) {
    for (const { id, attributes } of existingClaims) {
      if (attributes.package_name === packageName) continue;
      const foreignPatterns = attributes.index_patterns ?? [];
      const overlaps = indexPatterns.some((pattern) =>
        foreignPatterns.some((foreign) => patternsOverlap(pattern, foreign))
      );
      if (overlaps) {
        throw new DatasetClaimConflictError(
          `Dataset "${baseName}" overlaps "${id}" claimed by package "${attributes.package_name}".`
        );
      }
    }
  }
};

/**
 * Acquires a claim per base name by atomic create, and returns only the ids this call created.
 *
 * An existing claim owned by the same package is left **completely untouched**: not updated, not
 * re-stamped, not counted as acquired. Fleet's package lock is set inside the install state machine,
 * after ownership enforcement has already run, so a second live attempt of the same package is
 * possible here. Mutating an existing claim would let that attempt take a claim it will then fail to
 * release, stranding the dataset.
 */
export const acquireDatasetClaims = async ({
  soClient,
  packageName,
  packageVersion,
  installSource,
  attemptId,
  claims,
  origin = 'install',
}: {
  soClient: SavedObjectsClientContract;
  packageName: string;
  packageVersion: string;
  installSource: InstallSource;
  attemptId: string;
  claims: DatasetClaimRequest[];
  /** `install` and `backfill` claims never authorize takeover. Only `adoption` does (spec R2-1). */
  origin?: DatasetClaimOrigin;
}): Promise<{ acquired: string[] }> => {
  await assertNoOverlappingForeignClaims(soClient, packageName, claims);

  const acquired: string[] = [];

  for (const { baseName, indexPatterns } of claims) {
    try {
      await soClient.create<DatasetClaimAttributes>(
        DATASET_CLAIMS_SAVED_OBJECT_TYPE,
        {
          package_name: packageName,
          status: 'pending',
          origin,
          attempt_id: attemptId,
          index_patterns: indexPatterns,
          package_version: packageVersion,
          install_source: installSource,
        },
        { id: baseName, overwrite: false }
      );
      acquired.push(baseName);
      continue;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        await deleteClaims(soClient, acquired);
        throw error;
      }
    }

    let existing = await getClaim(soClient, baseName);
    if (!existing) {
      try {
        await soClient.create<DatasetClaimAttributes>(
          DATASET_CLAIMS_SAVED_OBJECT_TYPE,
          {
            package_name: packageName,
            status: 'pending',
            origin,
            attempt_id: attemptId,
            index_patterns: indexPatterns,
            package_version: packageVersion,
            install_source: installSource,
          },
          { id: baseName, overwrite: false }
        );
        acquired.push(baseName);
        continue;
      } catch (retryError) {
        if (!SavedObjectsErrorHelpers.isConflictError(retryError)) {
          await deleteClaims(soClient, acquired);
          throw retryError;
        }
      }
      existing = await getClaim(soClient, baseName);
      if (!existing) {
        await deleteClaims(soClient, acquired);
        throw new DatasetClaimConflictError(
          `Dataset "${baseName}" could not be claimed: the claim disappeared after a create conflict.`
        );
      }
    }

    if (existing.package_name !== packageName) {
      await deleteClaims(soClient, acquired);
      throw new DatasetClaimConflictError(
        `Dataset "${baseName}" is already claimed by package "${existing.package_name}". ` +
          `Adopt the dataset explicitly to assign it to "${packageName}".`
      );
    }

    // Ours already, whether active from a previous install or pending from another attempt.
    // Nothing to do, and deliberately nothing to write.
  }

  return { acquired };
};

/**
 * Promotes this package's claims once the install has fully succeeded, and refreshes the recorded
 * patterns and version. Called after the last step that can fail, so a claim never describes a
 * version that was not installed.
 */
export const finalizeDatasetClaims = async ({
  soClient,
  packageName,
  packageVersion,
  claims,
}: {
  soClient: SavedObjectsClientContract;
  packageName: string;
  packageVersion: string;
  claims: DatasetClaimRequest[];
}): Promise<void> => {
  for (const { baseName, indexPatterns } of claims) {
    const existing = await getClaim(soClient, baseName);
    if (!existing || existing.package_name !== packageName) continue;

    const patternsChanged =
      existing.index_patterns.length !== indexPatterns.length ||
      existing.index_patterns.some((pattern, index) => pattern !== indexPatterns[index]);
    const needsActivation = existing.status !== 'active';
    const versionChanged = existing.package_version !== packageVersion;
    if (!patternsChanged && !needsActivation && !versionChanged) continue;

    await soClient.update<DatasetClaimAttributes>(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName, {
      status: 'active',
      index_patterns: indexPatterns,
      package_version: packageVersion,
    });
  }
};

/**
 * Releases the claims this attempt created. Claims created by any other attempt, and claims that are
 * already active, are never touched. Runs under the ownership lock so POST cannot promote a pending
 * claim and then have this cleanup delete it.
 */
export const releaseAttemptClaims = async (
  soClient: SavedObjectsClientContract,
  packageName: string,
  attemptId: string
): Promise<void> => {
  return withDatasetOwnershipLock(async () => {
    const pending = await soClient.find<DatasetClaimAttributes>({
      type: DATASET_CLAIMS_SAVED_OBJECT_TYPE,
      filter: [
        attributesFilter('package_name', packageName),
        attributesFilter('status', 'pending'),
        attributesFilter('attempt_id', attemptId),
      ].join(' and '),
      perPage: 1000,
    });

    const stillThisAttempt: string[] = [];
    for (const { id } of pending.saved_objects) {
      const current = await getClaim(soClient, id);
      if (
        current &&
        current.package_name === packageName &&
        current.status === 'pending' &&
        current.attempt_id === attemptId
      ) {
        stillThisAttempt.push(id);
      }
    }

    await deleteClaims(soClient, stillThisAttempt);
  });
};

export const getDatasetClaims = async (
  soClient: SavedObjectsClientContract,
  baseNames: string[]
): Promise<Map<string, DatasetClaimAttributes>> => {
  if (baseNames.length === 0) return new Map();

  const response = await soClient.bulkGet<DatasetClaimAttributes>(
    baseNames.map((id) => ({ type: DATASET_CLAIMS_SAVED_OBJECT_TYPE, id }))
  );

  return new Map(
    response.saved_objects
      .filter((so): so is SavedObject<DatasetClaimAttributes> => !isSavedObjectErrorResult(so))
      .map((so) => [so.id, so.attributes])
  );
};

export const findClaimsForPackage = async (
  soClient: SavedObjectsClientContract,
  packageName: string
): Promise<Array<{ id: string; attributes: DatasetClaimAttributes }>> => {
  const response = await soClient.find<DatasetClaimAttributes>({
    type: DATASET_CLAIMS_SAVED_OBJECT_TYPE,
    filter: attributesFilter('package_name', packageName),
    perPage: 1000,
  });

  return response.saved_objects.map(({ id, attributes }) => ({ id, attributes }));
};

/**
 * Stores the pre-install pipeline of a foreign stream this package explicitly adopted, keyed by the
 * concrete data stream name. Recorded only on first adoption, so an upgrade never overwrites the
 * original baseline with the previous package version's own pipeline.
 */
export const recordAdoptedStreamBaselines = async (
  soClient: SavedObjectsClientContract,
  baseName: string,
  streams: AdoptedStreamBaseline[]
): Promise<void> => {
  const existing = await getClaim(soClient, baseName);
  if (!existing) return;

  const recorded = existing.adopted_streams ?? [];
  const known = new Set(recorded.map(({ name }) => name));
  const merged = [...recorded, ...streams.filter(({ name }) => !known.has(name))];
  if (merged.length === recorded.length) return;

  await soClient.update<DatasetClaimAttributes>(DATASET_CLAIMS_SAVED_OBJECT_TYPE, baseName, {
    adopted_streams: merged,
  });
};

/** Deletes claims by id. Missing claims are not an error. */
export const deleteClaims = async (
  soClient: SavedObjectsClientContract,
  ids: string[]
): Promise<void> => {
  for (const id of ids) {
    try {
      await soClient.delete(DATASET_CLAIMS_SAVED_OBJECT_TYPE, id);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
    }
  }
};
