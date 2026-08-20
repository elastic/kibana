/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import type { EsAssetReference, Installation } from '../../../../../common/types';
import { ElasticsearchAssetType } from '../../../../../common/types';

import { claimBaseNameOf } from './claim_names';
import { getDatasetClaims } from './claims';
import { DatasetOwnershipConflictError } from './errors';

const isEsNotFound = (err: unknown): boolean =>
  (err as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

const installedComponentIds = (installedEs: EsAssetReference[] | undefined): Set<string> =>
  new Set(
    (installedEs ?? [])
      .filter(({ type }) => type === ElasticsearchAssetType.componentTemplate)
      .map(({ id }) => id)
  );

const lookupInstalledEs = async (
  soClient: SavedObjectsClientContract,
  packageName: string
): Promise<EsAssetReference[]> => {
  const result = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name:"${packageName}"`,
    perPage: 1,
  });
  return result.saved_objects[0]?.attributes?.installed_es ?? [];
};

/**
 * A component template may be created or deleted only when it is absent, corroborated as this
 * package's (`_meta.package.name` and `installed_es`), or covered by an active adoption claim.
 */
export const assertComponentTemplatesMutable = async ({
  esClient,
  soClient,
  packageName,
  names,
  installedEs,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  packageName: string;
  names: string[];
  installedEs?: EsAssetReference[];
}): Promise<void> => {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return;

  const tracked = installedComponentIds(
    installedEs ?? (await lookupInstalledEs(soClient, packageName))
  );
  const claims = await getDatasetClaims(soClient, [
    ...new Set(unique.map((name) => claimBaseNameOf(name))),
  ]);

  for (const name of unique) {
    let existing:
      | {
          component_template?: { _meta?: { package?: { name?: string } } };
        }
      | undefined;
    try {
      const res = await esClient.cluster.getComponentTemplate({ name });
      existing = res?.component_templates?.[0];
    } catch (err) {
      if (isEsNotFound(err)) continue;
      throw err;
    }
    if (!existing) continue;

    const claim = claims.get(claimBaseNameOf(name));
    const adopted =
      claim?.package_name === packageName &&
      claim.origin === 'adoption' &&
      claim.status === 'active';
    if (adopted) continue;

    const metaOwner = existing.component_template?._meta?.package?.name;
    if (tracked.has(name) && (metaOwner === packageName || !metaOwner)) continue;

    throw new DatasetOwnershipConflictError(
      `Component template "${name}" is not owned by package "${packageName}". ` +
        `Adopt the dataset explicitly before modifying it.`
    );
  }
};
