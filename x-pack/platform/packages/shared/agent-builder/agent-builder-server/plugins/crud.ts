/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginManifestAuthor, UnmanagedPluginAssets } from '@kbn/agent-builder-common';

export interface PersistedPluginManifestMetadata {
  author?: PluginManifestAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PluginCreateRequest {
  id?: string;
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
