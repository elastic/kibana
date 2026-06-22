/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER } from '../../../dashboard/constants';

export const convertBuiltinSkill = (
  skill: SkillDefinition,
  spaceId?: string
): InternalSkillDefinition => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: spaceId
    ? skill.content.replaceAll(AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER, spaceId)
    : skill.content,
  readonly: true,
  experimental: skill.experimental ?? false,
  referencedContent: skill.referencedContent,
  referencedContentCount: skill.referencedContent?.length ?? 0,
  basePath: skill.basePath,
  getRegistryTools: () => skill.getRegistryTools?.() ?? [],
  getInlineTools: skill.getInlineTools,
});
