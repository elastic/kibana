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

const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)---\s*\r?\n?([\s\S]*)$/;

/**
 * Parses a SKILL.md file content, extracting YAML frontmatter metadata
 * and the markdown body.
 */
export const parseSkillFile = (rawContent: string): ParsedSkillFileResult => {
  const match = rawContent.match(frontmatterRegex);
  if (!match) {
    return {
      meta: {},
      content: rawContent.trim(),
    };
  }

  const [, frontmatterRaw, body] = match;
  const meta = parseFrontmatter(frontmatterRaw);

  return {
    meta,
    content: body.trim(),
  };
};

const parseFrontmatter = (raw: string): ParsedSkillMeta => {
  let parsed: Record<string, unknown>;
  try {
    parsed = (yaml.load(raw) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {};
  }

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
