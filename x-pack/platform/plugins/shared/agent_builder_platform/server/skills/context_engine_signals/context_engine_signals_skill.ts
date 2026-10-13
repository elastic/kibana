/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import content from './context_engine_signals.skill.md.text';

export const contextEngineSignalsSkill = defineSkillType({
  id: 'context-engine-signals',
  name: 'context-engine-signals',
  basePath: 'skills/platform/context-engine',
  experimental: true,
  description:
    'Read Context Engine signals — the record of how agents retrieved context. Load when investigating failed or empty retrievals, when agents fall back to raw data, when quantifying how often an AI index is working, or when tracing a retrieval back to the conversation that caused it.',
  content,
  getRegistryTools: () => [platformCoreTools.executeEsql, platformCoreTools.listIndices],
});
