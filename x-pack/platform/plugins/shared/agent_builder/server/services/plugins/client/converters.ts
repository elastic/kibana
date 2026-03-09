/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPluginArchive, PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginProperties } from './storage';
import { unmanagedAssetsToEs, unmanagedAssetsFromEs } from './storage';
import type {
  PluginDocument,
  PersistedPluginDefinition,
  PluginCreateRequest,
  PluginUpdateRequest,
} from './types';

export const fromEs = (document: PluginDocument): PersistedPluginDefinition => {
  if (!document._source) {
    throw new Error('No source found on plugin document');
  }
  const { _source: src } = document;
  return {
    id: src.id,
    name: src.name,
    version: src.version,
    description: src.description,
    manifest: {
      author: src.manifest.author,
      homepage: src.manifest.homepage,
      repository: src.manifest.repository,
      license: src.manifest.license,
      keywords: src.manifest.keywords,
    },
    source_url: src.source_url,
    skill_ids: src.skill_ids ?? [],
    unmanaged_assets: unmanagedAssetsFromEs(src.unmanaged_assets),
    created_at: src.created_at,
    updated_at: src.updated_at,
  };
};

export const createRequestToEs = ({
  id,
  createRequest,
  space,
  creationDate = new Date(),
}: {
  id: string;
  createRequest: PluginCreateRequest;
  space: string;
  creationDate?: Date;
}): PluginProperties => {
  return {
    id,
    name: createRequest.name,
    version: createRequest.version,
    space,
    description: createRequest.description,
    manifest: {
      author: createRequest.manifest.author,
      homepage: createRequest.manifest.homepage,
      repository: createRequest.manifest.repository,
      license: createRequest.manifest.license,
      keywords: createRequest.manifest.keywords,
    },
    source_url: createRequest.source_url,
    skill_ids: createRequest.skill_ids ?? [],
    unmanaged_assets: unmanagedAssetsToEs(createRequest.unmanaged_assets),
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
  };
};

/**
 * Converts a parsed plugin archive into a
 * {@link PluginCreateRequest} suitable for the persistence client.
 */
export const parsedArchiveToCreateRequest = ({
  parsedArchive,
  sourceUrl,
}: {
  parsedArchive: ParsedPluginArchive;
  sourceUrl?: string;
}): PluginCreateRequest => {
  const { manifest, unmanagedAssets } = parsedArchive;
  return {
    name: manifest.name,
    version: manifest.version ?? '0.0.0',
    description: manifest.description ?? '',
    manifest: {
      author: manifest.author,
      homepage: manifest.homepage,
      repository: manifest.repository,
      license: manifest.license,
      keywords: manifest.keywords,
    },
    source_url: sourceUrl,
    // TODO: must change when we properly add skills support
    skill_ids: parsedArchive.skills.map((skill) => skill.meta.name ?? ''),
    unmanaged_assets: unmanagedAssets,
  };
};

export const toPluginDefinition = (persisted: PersistedPluginDefinition): PluginDefinition => ({
  id: persisted.id,
  name: persisted.name,
  version: persisted.version,
  description: persisted.description,
  manifest: persisted.manifest,
  source_url: persisted.source_url,
  skill_ids: persisted.skill_ids,
  unmanaged_assets: persisted.unmanaged_assets,
  created_at: persisted.created_at,
  updated_at: persisted.updated_at,
});

export const updateRequestToEs = ({
  current,
  update,
  updateDate = new Date(),
}: {
  current: PluginProperties;
  update: PluginUpdateRequest;
  updateDate?: Date;
}): PluginProperties => {
  return {
    ...current,
    ...(update.version !== undefined && { version: update.version }),
    ...(update.description !== undefined && { description: update.description }),
    ...(update.manifest !== undefined && {
      manifest: {
        ...current.manifest,
        ...update.manifest,
      },
    }),
    ...(update.source_url !== undefined && { source_url: update.source_url }),
    ...(update.skill_ids !== undefined && { skill_ids: update.skill_ids }),
    ...(update.unmanaged_assets !== undefined && {
      unmanaged_assets: unmanagedAssetsToEs(update.unmanaged_assets),
    }),
    updated_at: updateDate.toISOString(),
  };
};
