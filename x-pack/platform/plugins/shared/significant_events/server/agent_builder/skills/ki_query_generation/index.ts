/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { MemoryToolsOptions } from '../../../memory_and_investigation/tools/memory';
import { createGetStreamFeaturesTool } from './get_stream_features/tool';
import { createValidateQueriesTool } from './validate_queries/tool';
import description from './description.text';
import content from './skill.md.text';

export const KI_QUERY_GENERATION_SKILL_ID = 'ki-query-generation' as const;

export const createKIQueryGenerationSkill = ({
  getScopedClients,
  server,
  logger,
}: MemoryToolsOptions) =>
  defineSkillType({
    id: KI_QUERY_GENERATION_SKILL_ID,
    name: 'ki-query-generation',
    basePath: 'skills/platform/streams',
    experimental: true,
    excludeFromElasticCapabilities: true,
    description,
    content,
    getInlineTools: () => {
      const tools: BuiltinSkillBoundedTool[] = [
        createGetStreamFeaturesTool({
          getScopedClients,
          server,
          logger: logger.get('ki_stream_features_get_tool'),
        }),
        createValidateQueriesTool({
          getScopedClients,
          server,
          logger: logger.get('ki_queries_validate_tool'),
        }),
      ];

      return tools.map(({ id, ...rest }) => ({ ...rest, id: id.replaceAll('.', '_') }));
    },
  });
