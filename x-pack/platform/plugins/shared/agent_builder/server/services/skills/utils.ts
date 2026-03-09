/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';

/**
 * Converts an InternalSkillDefinition to a PublicSkillDefinition
 * suitable for API responses. This is used at the route handler boundary.
 */
export const internalToPublicDefinition = async (
  skill: InternalSkillDefinition
): Promise<PublicSkillDefinition> => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: skill.content,
  referenced_content: skill.referencedContent?.map((rc) => ({
    name: rc.name,
    relativePath: rc.relativePath,
    content: rc.content,
  })),
  tool_ids: await skill.getRegistryTools(),
  readonly: skill.readonly,
});
