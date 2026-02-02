/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillsService, ExecutableTool } from '@kbn/agent-builder-server/runner';
import type { Runner, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { SkillServiceStart } from '../../skills';
import type { AnyToolTypeDefinition, ToolTypeDefinition } from '../../tools/tool_types';
import { convertTool } from '../../tools/builtin/converter';
import { toExecutableTool } from '../../tools/utils/tool_conversion';
import type { ToolDynamicPropsContext } from '../../tools/tool_types/definitions';
import type { BuiltinToolTypeDefinition } from '../../tools/tool_types/definitions';
import { isDisabledDefinition } from '../../tools/tool_types/definitions';
import { ToolAvailabilityCache } from '../../tools/builtin/availability_cache';
import type { ToolsServiceStart } from '../../tools';

export const createSkillsService = ({
  skillServiceStart,
  toolsServiceStart,
  runner,
  request,
  spaceId,
}: {
  skillServiceStart: SkillServiceStart;
  toolsServiceStart: ToolsServiceStart;
  runner: Runner;
  request: KibanaRequest;
  spaceId: string;
}): SkillsService => {
  const toolConverterFn = createSkillToolConverter({
    request,
    spaceId,
    definitions: toolsServiceStart.getToolDefinitions(),
    runner,
  });

  return {
    list: () => {
      return skillServiceStart.listSkills();
    },
    getSkillDefinition: (skillId) => {
      return skillServiceStart.getSkillDefinition(skillId);
    },
    convertSkillTool: toolConverterFn,
  };
};

type SkillToolConverterFn = (tool: SkillBoundedTool) => ExecutableTool;

export const createSkillToolConverter = ({
  request,
  spaceId,
  definitions,
  runner,
}: {
  request: KibanaRequest;
  spaceId: string;
  definitions: AnyToolTypeDefinition[];
  runner: Runner;
}): SkillToolConverterFn => {
  const definitionMap = definitions
    .filter((def) => !isDisabledDefinition(def))
    .reduce((map, def) => {
      map[def.toolType] = def as ToolTypeDefinition | BuiltinToolTypeDefinition;
      return map;
    }, {} as Record<ToolType, ToolTypeDefinition | BuiltinToolTypeDefinition>);

  const context: ToolDynamicPropsContext = {
    spaceId,
    request,
  };

  const cache = new ToolAvailabilityCache();

  return (tool) => {
    const definition = definitionMap[tool.type as ToolType]!;
    const converted: StaticToolRegistration = {
      ...tool,
      tags: [] as string[],
    } as StaticToolRegistration;
    const internal = convertTool({ tool: converted, context, definition, cache });
    return toExecutableTool({ tool: internal, request, runner, asInternal: true });
  };
};
