/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { InstallSource, InstallablePackage } from '../../../../../common/types';
import { withPackageSpan } from '../utils';

import { getPackageClaimNames, getPackageProspectiveTemplates } from './claim_names';
import { acquireDatasetClaims, recordAdoptedStreamBaselines } from './claims';
import { DatasetOwnershipConflictError } from './errors';
import { withDatasetOwnershipLock } from './lock';
import { resolveDatasetOwnership } from './resolve_ownership';

const UNTRUSTED_SOURCES: InstallSource[] = ['upload', 'custom'];

/**
 * Resolves ownership for an install attempt, rejects anything that would be a takeover, and claims
 * the datasets the install is about to write. Returns the data streams later steps may modify.
 *
 * Called once per attempt from outside the state machine, so a resumed install cannot reach template
 * creation without it. Resolution deliberately precedes acquisition: a claim written by this attempt
 * must never be readable as evidence that the attempt already owned the name.
 */
export const enforceInstallDatasetOwnership = async (args: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  packageInfo: InstallablePackage;
  installSource: InstallSource;
  attemptId: string;
  /**
   * Runs before the lock is released, after claims are acquired. Used to create the package SO so
   * DELETE cannot treat an in-flight first install as an abandoned adoption.
   */
  afterAcquire?: () => Promise<void>;
}): Promise<{ ownedDataStreams: string[]; acquiredDatasetClaims: string[] }> => {
  return withDatasetOwnershipLock(async () => {
    const result = await runEnforceInstallDatasetOwnership(args);
    await args.afterAcquire?.();
    return result;
  });
};

const runEnforceInstallDatasetOwnership = async ({
  esClient,
  soClient,
  logger,
  packageInfo,
  installSource,
  attemptId,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  packageInfo: InstallablePackage;
  installSource: InstallSource;
  attemptId: string;
}): Promise<{ ownedDataStreams: string[]; acquiredDatasetClaims: string[] }> => {
  // Prospective names come from the package manifest. Input packages and custom
  // integrations can synthesize extra index templates later in
  // `step_install_index_template_pipelines`. Those names are not claimed here.
  const claimNames = getPackageClaimNames(packageInfo);

  const prefixClaim = claimNames.find(({ isPrefix }) => isPrefix);
  if (UNTRUSTED_SOURCES.includes(installSource) && prefixClaim) {
    throw new DatasetOwnershipConflictError(
      `Package ${packageInfo.name} declares dataset_is_prefix for "${prefixClaim.baseName}". ` +
        `Prefix dataset ownership is not permitted for ${installSource} packages.`
    );
  }

  const ownership = await withPackageSpan('Resolve dataset ownership', () =>
    resolveDatasetOwnership({
      esClient,
      soClient,
      packageName: packageInfo.name,
      prospective: getPackageProspectiveTemplates(packageInfo),
    })
  );

  for (const warning of ownership.warnings) {
    logger.warn(
      `Package ${packageInfo.name} overlaps "${warning.name}", which keeps template ` +
        `"${warning.governingTemplate ?? warning.name}" (priority ${warning.governingPriority}).`
    );
  }

  if (ownership.conflicts.length > 0) {
    const detail = ownership.conflicts
      .map(
        ({ name, reason, owningPackage }) =>
          `"${name}" (${reason}${owningPackage ? `, owned by "${owningPackage}"` : ''})`
      )
      .join(', ');
    throw new DatasetOwnershipConflictError(
      `Package ${packageInfo.name} would take over resources it does not own: ${detail}. ` +
        `Adopt the dataset explicitly before installing.`
    );
  }

  const { acquired } = await acquireDatasetClaims({
    soClient,
    packageName: packageInfo.name,
    packageVersion: packageInfo.version,
    installSource,
    attemptId,
    origin: 'install',
    claims: claimNames.map(({ baseName, indexPattern }) => ({
      baseName,
      indexPatterns: [indexPattern],
    })),
  });

  // Baselines are captured before any asset is installed, while the original pipeline is still
  // trustworthy, and only for foreign streams this package explicitly adopted. Recording one for a
  // stream the package already owns would make a later uninstall restore the package's own pipeline.
  const byBaseName = new Map<string, Array<{ name: string; previous_default_pipeline?: string }>>();
  for (const { baseName, name, previousDefaultPipeline } of ownership.adoptedStreams) {
    byBaseName.set(baseName, [
      ...(byBaseName.get(baseName) ?? []),
      { name, previous_default_pipeline: previousDefaultPipeline },
    ]);
  }
  for (const [baseName, streams] of byBaseName) {
    await recordAdoptedStreamBaselines(soClient, baseName, streams);
  }

  return { ownedDataStreams: ownership.allowlist, acquiredDatasetClaims: acquired };
};
