/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';

import type { FleetConfigType } from '../../config';
import type { DownloadSource } from '../../types';
import type { PreconfiguredDownloadSource } from '../../../common/types';
import { downloadSourceService } from '../download_source';
import { agentPolicyService } from '../agent_policy';

export function getPreconfiguredDownloadSourcesFromConfig(
  config?: FleetConfigType
): PreconfiguredDownloadSource[] {
  const { binaryDownloadSource: sourcesFromConfig } = config ?? {};

  return (sourcesFromConfig ?? []).map((ds) => ({
    ...ds,
    is_preconfigured: true,
  }));
}

function hasChanged(existing: DownloadSource, preconfigured: PreconfiguredDownloadSource): boolean {
  return (
    existing.name !== preconfigured.name ||
    existing.host !== preconfigured.host ||
    existing.is_default !== preconfigured.is_default ||
    !isEqual(existing.proxy_id ?? null, preconfigured.proxy_id ?? null) ||
    !isEqual(existing.ssl ?? null, preconfigured.ssl ?? null)
  );
}

async function createOrUpdatePreconfiguredDownloadSources(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredSources: PreconfiguredDownloadSource[]
) {
  const allExistingSources = await downloadSourceService.list();

  for (const preconfigured of preconfiguredSources) {
    const existing = allExistingSources.items.find((ds) => ds.id === preconfigured.id);
    if (!existing) {
      await downloadSourceService.create(soClient, esClient, preconfigured, {
        id: preconfigured.id,
        overwrite: true,
      });
    } else if (!existing.is_preconfigured || hasChanged(existing, preconfigured)) {
      await downloadSourceService.update(soClient, esClient, preconfigured.id, {
        ...preconfigured,
        is_preconfigured: true,
      });
      await agentPolicyService.bumpAllAgentPoliciesForDownloadSource(esClient, preconfigured.id, {
        isDefault: preconfigured.is_default,
      });
    }
  }
}

async function cleanPreconfiguredDownloadSources(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredSources: PreconfiguredDownloadSource[]
) {
  const allDownloadSources = await downloadSourceService.list();
  const existingPreconfigured = allDownloadSources.items.filter((ds) => ds.is_preconfigured === true);

  for (const existing of existingPreconfigured) {
    const stillConfigured = preconfiguredSources.find((ds) => ds.id === existing.id);
    if (stillConfigured) {
      continue;
    }

    // If this preconfigured source was removed from config, unmark it as preconfigured
    // (don't delete, since it may be in use by agent policies)
    await downloadSourceService.update(soClient, esClient, existing.id, {
      is_preconfigured: false,
    });
  }
}

export async function ensurePreconfiguredDownloadSources(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredSources: PreconfiguredDownloadSource[]
) {
  await createOrUpdatePreconfiguredDownloadSources(soClient, esClient, preconfiguredSources);
  await cleanPreconfiguredDownloadSources(soClient, esClient, preconfiguredSources);
}
