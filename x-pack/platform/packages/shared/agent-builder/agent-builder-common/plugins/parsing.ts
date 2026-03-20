/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginManifestAuthor, UnmanagedPluginAssets } from './plugin_definition';

/**
 * Claude plugin manifest schema.
 *
 * Follows the spec at https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema
 * `name` is the only required field.
 */
export interface PluginManifest {
  name: string;
  version?: string;
  description?: string;
  author?: PluginManifestAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  commands?: string | string[];
  agents?: string | string[];
  skills?: string | string[];
  hooks?: string | string[];
  mcpServers?: string | string[];
  outputStyles?: string | string[];
  lspServers?: string | string[];
}

/**
 * Metadata extracted from the YAML frontmatter of a skill's SKILL.md file.
 */
export interface ParsedSkillMeta {
  name?: string;
  description?: string;
  disableModelInvocation?: boolean;
  allowedTools?: string[];
}

/**
 * A fully parsed skill from a plugin archive.
 */
export interface ParsedSkillFile {
  /** Directory name of the skill within the archive (e.g. `pdf-processor`) */
  dirName: string;
  /** Frontmatter metadata */
  meta: ParsedSkillMeta;
  /** Markdown body content (without frontmatter) */
  content: string;
  /** Sibling files found alongside SKILL.md */
  referencedFiles: ParsedSkillReferencedFile[];
}

export interface ParsedSkillReferencedFile {
  relativePath: string;
  content: string;
}

/**
 * Result of parsing and validating a Claude plugin zip archive.
 */
export interface ParsedPluginArchive {
  manifest: PluginManifest;
  skills: ParsedSkillFile[];
  unmanagedAssets: UnmanagedPluginAssets;
}
