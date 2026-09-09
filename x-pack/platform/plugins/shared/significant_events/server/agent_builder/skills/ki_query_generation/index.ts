/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './description.text';
import content from './skill.md.text';

export const KI_QUERY_GENERATION_SKILL_ID = 'ki-query-generation' as const;

export const kiQueryGenerationSkill = defineSkillType({
  id: KI_QUERY_GENERATION_SKILL_ID,
  name: 'ki-query-generation',
  basePath: 'skills/platform/streams',
  experimental: true,
  excludeFromElasticCapabilities: true,
  description,
  content,
  getRegistryTools: () => [
    platformSignificantEventsTools.getStreamFeatures,
    platformSignificantEventsTools.validateQueries,
  ],
});
