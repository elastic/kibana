/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { internalTools, ToolType } from '@kbn/agent-builder-common';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type {
  AgentBuilderAnalytics,
  AgentBuilderTracking,
  BuiltinToolDefinition,
  ToolReturnSummarizerFn,
} from '@kbn/agent-builder-server';
import { loadSkillTools } from '../../../skills/load_skill_tools';
import { getSkillReferencedContentEntryPath } from '../../runner/store/volumes/skills/utils';

const schema = z.object({
  name: z.string().describe("The skill's name as listed in the SKILLS section."),
  base_path: z
    .string()
    .optional()
    .describe(
      '(Optional) disambiguator when multiple skills share the same name. Match the basePath shown alongside the skill name in the SKILLS section.'
    ),
});

/**
 * Identity transform. Returning the original results unchanged causes the
 * conversation result transformer to mark them as cleaned, which opts the
 * tool's results out of filestore substitution at high context usage.
 */
const preserveResults: ToolReturnSummarizerFn = (toolReturn) => toolReturn.results;

export const createLoadSkillTool = ({
  analyticsService,
  trackingService,
}: {
  analyticsService?: AgentBuilderAnalytics;
  trackingService?: AgentBuilderTracking;
} = {}): BuiltinToolDefinition<typeof schema> => ({
  id: internalTools.loadSkill,
  description:
    'Load a skill by name. Returns the skill content, its referenced files, and the list of tools the skill makes available. Loading a skill also dynamically registers its specialized tools so you can use them in subsequent calls.',
  type: ToolType.builtin,
  schema,
  tags: ['skills'],
  summarizeToolReturn: preserveResults,
  handler: async ({ name, base_path: basePath }, ctx) => {
    const { skills, toolProvider, toolManager, request, logger, runContext } = ctx;

    const all = await skills.list({ includePlugins: true });
    const matches = all.filter(
      (s) => s.name === name && (basePath === undefined || s.basePath === basePath)
    );

    if (matches.length === 0) {
      return {
        results: [
          createErrorResult(
            basePath
              ? `Skill '${name}' (basePath '${basePath}') not found.`
              : `Skill '${name}' not found.`
          ),
        ],
      };
    }

    if (matches.length > 1) {
      const options = matches
        .map((s) => `{ name: '${s.name}', base_path: '${s.basePath}' }`)
        .join(', ');
      return {
        results: [
          createErrorResult(
            `Skill name '${name}' is ambiguous. Multiple skills match: ${options}. Re-call load_skill with the 'base_path' parameter to disambiguate.`
          ),
        ],
      };
    }

    const skill = matches[0];

    let loadedToolIds: string[];
    try {
      loadedToolIds = await loadSkillTools({
        skill,
        skillsService: skills,
        toolProvider,
        request,
        toolManager,
        logger,
        runContext,
        analyticsService,
        trackingService,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [createErrorResult(`Failed to load skill '${skill.name}': ${message}`)],
      };
    }

    return {
      results: [
        createOtherResult({
          skill: { id: skill.id, name: skill.name, description: skill.description },
          content: skill.content,
          referenced_files: (skill.referencedContent ?? []).map((rc) => ({
            name: rc.name,
            relative_path: rc.relativePath,
            path: getSkillReferencedContentEntryPath({ skill, referencedContent: rc }),
          })),
          loaded_tools: loadedToolIds,
        }),
      ],
    };
  },
});
