/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  createMemoryListTool,
  createMemoryReadTool,
  createMemorySearchTool,
  type MemoryToolsOptions,
} from '../../../memory_and_investigation/tools/memory';
import groundingContent from './skill.md.text';
import description from './description.text';
import { finalizeFeaturesTool } from './finalize_features_tool';

export const FEATURE_IDENTIFICATION_SKILL_ID = 'feature-identification';

export const createFeatureIdentificationSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: FEATURE_IDENTIFICATION_SKILL_ID,
    name: 'feature-identification',
    basePath: 'skills/platform/streams',
    experimental: true,
    excludeFromElasticCapabilities: true,
    description,
    content: groundingContent,
    getInlineTools: () => {
      const tools: BuiltinSkillBoundedTool[] = [
        createMemorySearchTool(options),
        createMemoryReadTool(options),
        createMemoryListTool(options),
        finalizeFeaturesTool,
      ];

      return tools.map(({ id, ...rest }) => ({ ...rest, id: id.replaceAll('.', '_') }));
    },
  });

export { FINALIZE_FEATURES_TOOL_ID } from './finalize_features_tool';
