/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { AvailabilityCache } from '../../common/availability_cache';

export const convertBuiltinSkill = ({
  skill,
  cache,
}: {
  skill: SkillDefinition;
  cache: AvailabilityCache;
}): InternalSkillDefinition => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  content: skill.content,
  readonly: true,
  experimental: skill.experimental ?? false,
  uiSettingRequired: skill.uiSettingRequired,
  excludeFromElasticCapabilities: skill.excludeFromElasticCapabilities ?? false,
  referencedContent: skill.referencedContent,
  referencedContentCount: skill.referencedContent?.length ?? 0,
  basePath: skill.basePath,
  getRegistryTools: () => skill.getRegistryTools?.() ?? [],
  getInlineTools: skill.getInlineTools,
  isAvailable: skill.availability
    ? (ctx) => cache.getOrCompute(skill.id, skill.availability!, ctx)
    : undefined,
});
