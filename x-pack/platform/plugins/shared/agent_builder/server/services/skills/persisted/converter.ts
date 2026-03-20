/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillPersistedDefinition } from './client';

export const convertPersistedSkill = (
  skill: SkillPersistedDefinition
): InternalSkillDefinition => ({
  id: skill.id,
  name: skill.name,
  basePath: '/skills',
  description: skill.description,
  content: skill.content,
  readonly: !!skill.plugin_id,
  referencedContent: skill.referenced_content?.map((rc) => ({
    name: rc.name,
    relativePath: rc.relativePath,
    content: rc.content,
  })),
  getRegistryTools: () => skill.tool_ids ?? [],
  plugin_id: skill.plugin_id,
  referencedContentCount: skill.referenced_content_count,
});
