/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { ParsedSkillMeta } from '@kbn/agent-builder-common';

export interface ParsedSkillFileResult {
  meta: ParsedSkillMeta;
  content: string;
}

export interface FrontmatterParseResult {
  /**
   * Parsed YAML frontmatter object, or `undefined` when the content has no
   * `--- ... ---` frontmatter block. An empty or malformed block yields `{}`,
   * so callers can distinguish "no block" from "block present but empty".
   */
  frontmatter: Record<string, unknown> | undefined;
  /** Markdown body with the frontmatter block removed (not trimmed). */
  body: string;
}

const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)---\s*\r?\n?([\s\S]*)$/;

/**
 * Splits markdown content into its YAML frontmatter object and body.
 *
 * Malformed YAML is treated as an empty object rather than throwing, so callers
 * get consistent behavior regardless of frontmatter validity.
 */
export const splitFrontmatter = (rawContent: string): FrontmatterParseResult => {
  const match = rawContent.match(frontmatterRegex);
  if (!match) {
    return { frontmatter: undefined, body: rawContent };
  }

  const [, frontmatterRaw, body] = match;

  let parsed: unknown;
  try {
    parsed = yaml.load(frontmatterRaw);
  } catch {
    parsed = undefined;
  }

  const frontmatter =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

  return { frontmatter, body };
};

/**
 * Parses a SKILL.md file content, extracting YAML frontmatter metadata
 * and the markdown body.
 */
export const parseSkillFile = (rawContent: string): ParsedSkillFileResult => {
  const { frontmatter, body } = splitFrontmatter(rawContent);

  return {
    meta: frontmatter ? toSkillMeta(frontmatter) : {},
    content: body.trim(),
  };
};

const toSkillMeta = (parsed: Record<string, unknown>): ParsedSkillMeta => {
  const meta: ParsedSkillMeta = {};

  if (typeof parsed.name === 'string') {
    meta.name = parsed.name;
  }
  if (typeof parsed.description === 'string') {
    meta.description = parsed.description;
  }
  if (typeof parsed['disable-model-invocation'] === 'boolean') {
    meta.disableModelInvocation = parsed['disable-model-invocation'];
  }
  if (typeof parsed['allowed-tools'] === 'string') {
    meta.allowedTools = parsed['allowed-tools']
      .split(',')
      .map((tool) => tool.trim())
      .filter((tool) => tool.length > 0);
  }

  return meta;
};
