/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';
import type { ElasticSkillConfig } from '../../elastic_skills';
import { contextEngineSkillAvailability } from '../../context_engine_skill_availability';

export const config: ElasticSkillConfig = {
  availability: contextEngineSkillAvailability,
  getRegistryTools: () => Object.values(contextEngineAiIndexTools),
};
