/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';

/**
 * Converts a built-in SkillDefinition to a PublicSkillDefinition
 * suitable for API responses. Built-in skills are always marked as readonly.
 */
export const builtinSkillToPublicDefinition = (skill: SkillDefinition): PublicSkillDefinition => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: skill.content,
  referenced_content: skill.referencedContent?.map((rc) => ({
    name: rc.name,
    relativePath: rc.relativePath,
    content: rc.content,
  })),
  readonly: true,
});

/**
 * Converts a persisted skill (from the Elasticsearch client) to a PublicSkillDefinition.
 * Persisted skills are always marked as not readonly.
 */
export const persistedSkillToPublicDefinition = (skill: {
  id: string;
  name: string;
  description: string;
  content: string;
  referenced_content?: Array<{
    name: string;
    relativePath: string;
    content: string;
  }>;
  tool_ids?: string[];
}): PublicSkillDefinition => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: skill.content,
  referenced_content: skill.referenced_content,
  tool_ids: skill.tool_ids,
  readonly: false,
});
