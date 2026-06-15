/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';

/**
 * Converts a builtin tool definition into a skill-bounded tool: drops the
 * `tags`/`availability` fields that skill-bounded tools don't carry, and
 * rewrites the dotted tool id into the underscore form expected by skills.
 */
export const toInlineMemoryTool = ({
  tags,
  availability,
  id,
  ...rest
}: BuiltinToolDefinition): BuiltinSkillBoundedTool => ({
  ...rest,
  id: id.replaceAll('.', '_'),
});

export const toInlineMemoryTools = (tools: BuiltinToolDefinition[]): BuiltinSkillBoundedTool[] =>
  tools.map(toInlineMemoryTool);
