/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedSkillMeta } from '@kbn/agent-builder-common';
import { splitFrontmatter } from '@kbn/agent-builder-skill-loader';

export interface ParsedSkillFileResult {
  meta: ParsedSkillMeta;
  content: string;
}

/**
 * Parses a SKILL.md file content, extracting YAML frontmatter metadata
 * and the markdown body.
 */
export const parseSkillFile = (rawContent: string): ParsedSkillFileResult => {
  const { frontmatter, body } = splitFrontmatter(rawContent);

  return {
    meta: frontmatter ? toSkillMeta(frontmatter) : {},
    content: body,
  };
};

const toSkillMeta = (frontmatter: Record<string, unknown>): ParsedSkillMeta => {
  const {
    name,
    description,
    'disable-model-invocation': disableModelInvocation,
    'allowed-tools': allowedTools,
  } = frontmatter;

  const meta: ParsedSkillMeta = {};

  if (typeof name === 'string') {
    meta.name = name;
  }
  if (typeof description === 'string') {
    meta.description = description;
  }
  if (typeof disableModelInvocation === 'boolean') {
    meta.disableModelInvocation = disableModelInvocation;
  }
  if (typeof allowedTools === 'string') {
    meta.allowedTools = allowedTools
      .split(',')
      .map((tool) => tool.trim())
      .filter((tool) => tool.length > 0);
  }

  return meta;
};
