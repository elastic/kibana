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
  return ((config?.binaryDownloadSource ?? []) as PreconfiguredDownloadSource[]).map((ds) => ({
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
  preconfiguredSources: PreconfiguredDownloadSource[],
  allExistingSources: DownloadSource[]
) {
  for (const preconfigured of preconfiguredSources) {
    const existing = allExistingSources.find((ds) => ds.id === preconfigured.id);
    if (!existing) {
      await downloadSourceService.create(soClient, esClient, preconfigured, {
        id: preconfigured.id,
        overwrite: true,
      });
    } else {
      const dataChanged = hasChanged(existing, preconfigured);
      if (!existing.is_preconfigured || dataChanged) {
        await downloadSourceService.update(soClient, esClient, preconfigured.id, {
          ...preconfigured,
          is_preconfigured: true,
        });
        if (dataChanged) {
          await agentPolicyService.bumpAllAgentPoliciesForDownloadSource(
            esClient,
            preconfigured.id,
            { isDefault: preconfigured.is_default }
          );
        }
      }
    }
  }
}

async function cleanPreconfiguredDownloadSources(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredSources: PreconfiguredDownloadSource[],
  allExistingSources: DownloadSource[]
) {
  const existingPreconfigured = allExistingSources.filter((ds) => ds.is_preconfigured === true);

  for (const existing of existingPreconfigured) {
    if (preconfiguredSources.find((ds) => ds.id === existing.id)) {
      continue;
    }

    const isInUse = await agentPolicyService.agentPoliciesExistForDownloadSourceId(existing.id);
    if (isInUse) {
      // Keep the source but unmark it so users can manage it freely
      await downloadSourceService.update(soClient, esClient, existing.id, {
        is_preconfigured: false,
      });
    } else {
      await downloadSourceService.delete(existing.id, { fromPreconfiguration: true });
    }
  }
}

export async function ensurePreconfiguredDownloadSources(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredSources: PreconfiguredDownloadSource[]
) {
  const { items: allExistingSources } = await downloadSourceService.list();
  await createOrUpdatePreconfiguredDownloadSources(
    soClient,
    esClient,
    preconfiguredSources,
    allExistingSources
  );
  await cleanPreconfiguredDownloadSources(
    soClient,
    esClient,
    preconfiguredSources,
    allExistingSources
  );
}
