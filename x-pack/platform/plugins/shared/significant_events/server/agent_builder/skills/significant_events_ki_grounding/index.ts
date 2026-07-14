/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformSignificantEventsTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import description from './description.text';
import content from './skill.md.text';

export const SIGNIFICANT_EVENTS_KI_GROUNDING_SKILL_ID = 'significant-events-ki-grounding' as const;

export const significantEventsKIGroundingSkill = defineSkillType({
  id: SIGNIFICANT_EVENTS_KI_GROUNDING_SKILL_ID,
  name: 'significant-events-ki-grounding',
  basePath: 'skills/platform/streams',
  description,
  content,
  getRegistryTools: () => [
    platformSignificantEventsTools.searchKnowledgeIndicators,
    platformCoreTools.executeEsql,
  ],
});
