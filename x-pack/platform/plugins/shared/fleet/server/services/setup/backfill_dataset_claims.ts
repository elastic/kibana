/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import {
  DATASET_CLAIMS_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../constants';
import type { Installation } from '../../types';
import type { InstallSource } from '../../../common/types';
import type { DatasetClaimAttributes } from '../epm/packages/dataset_ownership';
import {
  acquireDatasetClaims,
  deleteClaims,
  finalizeDatasetClaims,
  patternsOverlap,
  withDatasetOwnershipLock,
} from '../epm/packages/dataset_ownership';

interface Candidate {
  baseName: string;
  indexPatterns: string[];
  claimants: Array<{ name: string; version: string; source: InstallSource }>;
}

const isNotFound = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

/**
 * Creates claims for datasets already owned by installed packages, so the ownership invariants apply
 * to pre-existing installations. Deliberately conservative: anything ambiguous is reported and left
 * alone rather than resolved by guessing.
 */
export const backfillDatasetClaims = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<{ created: number; skipped: string[]; conflicts: string[] }> => {
  const installed = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  // Group by template id first, so traversal order never decides ownership.
  const byBaseName = new Map<string, Candidate['claimants']>();
  for (const { attributes } of installed.saved_objects) {
    for (const ref of attributes.installed_es ?? []) {
      if (ref.type !== 'index_template') continue;
      // Namespace-scoped templates are not dataset claims: their ids look like
      // "logs-x@namespace.prod" and the base template already carries the claim.
      if (ref.id.includes('@')) continue;
      byBaseName.set(ref.id, [
        ...(byBaseName.get(ref.id) ?? []),
        { name: attributes.name, version: attributes.version, source: attributes.install_source },
      ]);
    }
  }

  const skipped: string[] = [];
  const conflicts: string[] = [];
  const candidates: Candidate[] = [];

  // Real patterns from Elasticsearch. Reconstructing `${baseName}-*` would lose dataset_is_prefix
  // and make overlap detection miss exactly the case it exists for.
  for (const [baseName, claimants] of byBaseName) {
    try {
      const { index_templates: found } = await esClient.indices.getIndexTemplate({
        name: baseName,
      });
      const indexPatterns = ([] as string[]).concat(
        found?.[0]?.index_template?.index_patterns ?? []
      );
      if (indexPatterns.length === 0) {
        skipped.push(baseName);
        logger.warn(
          `Dataset "${baseName}" has no index patterns in Elasticsearch. No claim created.`
        );
        continue;
      }
      candidates.push({ baseName, indexPatterns, claimants });
    } catch (error) {
      if (!isNotFound(error)) throw error;
      skipped.push(baseName);
      logger.warn(
        `Index template "${baseName}" is referenced by an installed package but is missing from ` +
          `Elasticsearch. No claim created.`
      );
    }
  }

  const soleOwnerOf = (candidate: Candidate): string | undefined =>
    candidate.claimants.length === 1 ? candidate.claimants[0].name : undefined;

  /**
   * Overlap only matters between different owners. One package declaring both `logs-foo` as a
   * prefix and `logs-foo.bar` overlaps itself by design.
   */
  const foreignOverlaps = (candidate: Candidate): Candidate[] => {
    const owner = soleOwnerOf(candidate);
    return candidates.filter(
      (other) =>
        other.baseName !== candidate.baseName &&
        soleOwnerOf(other) !== owner &&
        other.indexPatterns.some((otherPattern) =>
          candidate.indexPatterns.some((pattern) => patternsOverlap(pattern, otherPattern))
        )
    );
  };

  let created = 0;

  for (const candidate of candidates) {
    const { baseName, indexPatterns, claimants } = candidate;

    if (claimants.length > 1) {
      conflicts.push(baseName);
      logger.error(
        `Dataset "${baseName}" is claimed by multiple installed packages: ` +
          `${claimants.map(({ name }) => name).join(', ')}. No claim created, resolve manually.`
      );
      continue;
    }

    const overlapping = foreignOverlaps(candidate);
    if (overlapping.length > 0) {
      conflicts.push(baseName);
      logger.error(
        `Dataset "${baseName}" overlaps ${overlapping.map(({ baseName: n }) => n).join(', ')}, ` +
          `owned by other packages. No claim created, resolve manually.`
      );
      continue;
    }

    const [owner] = claimants;

    // Never ratify an uploaded package's ownership. An uploaded package holding a dataset may be the
    // reported attack rather than a legitimate install, so it stays unclaimed until an operator
    // adopts it explicitly.
    if (owner.source === 'upload') {
      skipped.push(baseName);
      logger.warn(
        `Dataset "${baseName}" is held by uploaded package "${owner.name}". No claim created. ` +
          `Verify this package legitimately owns the dataset, then adopt it explicitly.`
      );
      continue;
    }

    const claims = [{ baseName, indexPatterns }];
    try {
      await withDatasetOwnershipLock(async () => {
        const { acquired } = await acquireDatasetClaims({
          soClient,
          packageName: owner.name,
          packageVersion: owner.version,
          installSource: owner.source,
          attemptId: `backfill-${uuidv4()}`,
          origin: 'backfill',
          claims,
        });
        if (acquired.length > 0) {
          await finalizeDatasetClaims({
            soClient,
            packageName: owner.name,
            packageVersion: owner.version,
            claims,
          });
          created += 1;
        }
      });
    } catch (error) {
      conflicts.push(baseName);
      logger.error(
        `Could not backfill dataset claim for "${baseName}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return { created, skipped, conflicts };
};

/**
 * Deletes claims left `pending` by a process that died mid-install, for packages that are not
 * installed at all. This is what makes a lease unnecessary: acquisition never steals a pending
 * claim, and a genuinely abandoned one is reclaimed here on the next Fleet setup.
 *
 * Adoption claims are exempt: they are deliberately created before the package exists.
 */
export const sweepOrphanedDatasetClaims = async (
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<{ deleted: string[] }> => {
  return withDatasetOwnershipLock(async () => {
    const pending = await soClient.find<DatasetClaimAttributes>({
      type: DATASET_CLAIMS_SAVED_OBJECT_TYPE,
      filter: `${DATASET_CLAIMS_SAVED_OBJECT_TYPE}.attributes.status:"pending"`,
      perPage: SO_SEARCH_LIMIT,
    });
    if (pending.saved_objects.length === 0) return { deleted: [] };

    const installed = await soClient.find<Installation>({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      perPage: SO_SEARCH_LIMIT,
    });
    const installedNames = new Set(
      installed.saved_objects.map(({ attributes }) => attributes.name)
    );

    const orphaned = pending.saved_objects
      .filter(
        ({ attributes }) =>
          attributes.origin !== 'adoption' && !installedNames.has(attributes.package_name)
      )
      .map(({ id }) => id);

    if (orphaned.length > 0) {
      logger.warn(
        `Releasing ${orphaned.length} dataset claims left pending by uninstalled packages`
      );
      await deleteClaims(soClient, orphaned);
    }
    return { deleted: orphaned };
  });
};
