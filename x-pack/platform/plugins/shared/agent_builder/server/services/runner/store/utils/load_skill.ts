/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProvider } from '@kbn/agent-builder-server';
import type { SkillsService, ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { pickTools } from '../../../agents/modes/utils/select_tools';
import type { SkillFileEntry } from '../volumes/skills/types';

export async function loadSkillTools({
  skillsService,
  entry,
  toolProvider,
  request,
  toolManager,
  logger,
}: {
  skillsService: SkillsService;
  entry: SkillFileEntry;
  toolProvider: ToolProvider;
  request: KibanaRequest<unknown, unknown, unknown, any>;
  toolManager: ToolManager;
  logger: Logger;
}) {
  const skill = skillsService.getSkillDefinition(entry.metadata.skill_id);
  if (skill) {
    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineExecutableTools = inlineTools.map((tool) => skillsService.convertSkillTool(tool));

    const registryToolIds = (await skill.getRegistryTools?.()) ?? [];
    if (registryToolIds.length > 25) {
      throw new Error(
        `Skill '${skill.id}' returned ${registryToolIds.length} registry tools, exceeding the 25-tool limit.`
      );
    }
    const registryExecutableTools =
      registryToolIds.length > 0
        ? await pickTools({ toolProvider, selection: [{ tool_ids: registryToolIds }], request })
        : [];

    await toolManager.addTools(
      {
        type: ToolManagerToolType.executable,
        tools: [...inlineExecutableTools, ...registryExecutableTools],
        logger,
      },
      {
        dynamic: true,
      }
    );
  } else {
    logger.debug(`Skill '${entry.metadata.skill_id}' not found in registry.`);
  }
}
