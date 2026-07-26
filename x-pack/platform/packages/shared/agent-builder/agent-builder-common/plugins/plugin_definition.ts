/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Author information from the plugin manifest.
 */
export interface PluginManifestAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * Assets present in the plugin archive that are not yet supported for installation.
 * Each field contains the list of file paths found for that asset type.
 */
export interface UnmanagedPluginAssets {
  agents: string[];
  hooks: string[];
  mcp_servers: string[];
  output_styles: string[];
  lsp_servers: string[];
}

/**
 * Manifest metadata stored alongside a persisted plugin.
 * Contains the optional manifest fields that are not promoted to
 * top-level plugin fields.
 */
export interface PluginManifestMetadata {
  author?: PluginManifestAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

/**
 * Public API-facing representation of an installed plugin.
 */
export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  /**
   * Whether the plugin is read-only (built-in) or user-managed (persisted).
   * Built-in plugins are registered programmatically and cannot be modified or deleted.
   */
  readonly: boolean;
  manifest: PluginManifestMetadata;
  source_url?: string;
  skill_ids: string[];
  unmanaged_assets: UnmanagedPluginAssets;
  created_at: string;
  updated_at: string;
}
