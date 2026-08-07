/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformMemoryTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import description from './description.text';
import content from './skill.md.text';

export const AGENT_MEMORY_SKILL_ID = 'agent-memory';

/**
 * Teaches an agent how to *use* memory well: what belongs in it, when to search
 * before answering, and how to keep pages from fragmenting.
 *
 * Requests the tools from the registry rather than inlining copies — inline
 * copies would present the model with two identical tool families under colliding
 * ids, and would bypass the availability gate.
 */
export const createAgentMemorySkill = () =>
  defineSkillType({
    id: AGENT_MEMORY_SKILL_ID,
    name: AGENT_MEMORY_SKILL_ID,
    basePath: 'skills/platform/memory',
    description,
    content,
    getRegistryTools: () => Object.values(platformMemoryTools),
  });
