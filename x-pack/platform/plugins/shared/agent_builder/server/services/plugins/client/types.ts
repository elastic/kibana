/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { PluginManifestAuthor, UnmanagedPluginAssets } from '@kbn/agent-builder-common';
import type { PluginProperties } from './storage';

export type PluginDocument = Pick<GetResponse<PluginProperties>, '_source' | '_id'>;

export interface PersistedPluginManifestMetadata {
  author?: PluginManifestAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PersistedPluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  manifest: PersistedPluginManifestMetadata;
  source_url?: string;
  skill_ids: string[];
  unmanaged_assets: UnmanagedPluginAssets;
  created_at: string;
  updated_at: string;
}

export interface PluginCreateRequest {
  name: string;
  version: string;
  description: string;
  manifest: PersistedPluginManifestMetadata;
  source_url?: string;
  skill_ids?: string[];
  unmanaged_assets: UnmanagedPluginAssets;
}

export interface PluginUpdateRequest {
  version?: string;
  description?: string;
  manifest?: PersistedPluginManifestMetadata;
  source_url?: string;
  skill_ids?: string[];
  unmanaged_assets?: UnmanagedPluginAssets;
}
