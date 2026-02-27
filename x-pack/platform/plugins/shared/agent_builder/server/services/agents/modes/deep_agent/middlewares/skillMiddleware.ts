/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { Skill } from '@kbn/agent-builder-common/skills';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { groupSkillsByDomain } from '../utils/skill_discovery';

type SkillToolContext = Omit<ToolHandlerContext, 'resultStore'>;

/**
 * Creates LangChain tools for skill discovery, reading, and invocation.
 */
export const createSkillTools = (
  skills: Skill[],
  _events: AgentEventEmitter,
  _context: SkillToolContext
) => {
  const invokeSkillTool = new DynamicStructuredTool({
    name: 'invoke_skill',
    description: 'Invoke a tool from a discovered skill by name.',
    schema: z.object({
      name: z.string().describe('The tool name to invoke'),
      parameters: z.record(z.unknown()).describe('Parameters to pass to the tool'),
    }),
    func: async ({ name, parameters }) => {
      for (const skill of skills) {
        const tool = skill.tools.find((t) => t.name === name);
        if (tool) {
          return tool.invoke(parameters);
        }
      }
      return `Tool "${name}" not found in any available skill.`;
    },
  });

  const readSkillToolsTool = new DynamicStructuredTool({
    name: 'read_skill_tools',
    description: 'Get detailed information about the tools available in a specific skill.',
    schema: z.object({
      skill_namespace: z.string().describe('The namespace of the skill to inspect'),
    }),
    func: async ({ skill_namespace: skillNamespace }) => {
      const skill = skills.find((s) => s.namespace === skillNamespace);
      if (!skill) {
        return `Skill "${skillNamespace}" not found.`;
      }
      const toolDescriptions = skill.tools.map((t) => `- **${t.name}**: ${t.description}`);
      return `### ${skill.name} (${skill.namespace})\n${
        skill.description
      }\n\n**Tools:**\n${toolDescriptions.join('\n')}`;
    },
  });

  const discoverSkillsTool = new DynamicStructuredTool({
    name: 'discover_skills',
    description: 'Search for skills by keywords to find relevant capabilities.',
    schema: z.object({
      query: z.string().describe('Keywords to search for'),
    }),
    func: async ({ query }) => {
      const queryLower = query.toLowerCase();
      const matches = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLower) ||
          s.description.toLowerCase().includes(queryLower) ||
          s.namespace.toLowerCase().includes(queryLower)
      );

      if (matches.length === 0) {
        return 'No skills found matching your query.';
      }

      const domainGroups = groupSkillsByDomain(matches);
      const lines: string[] = [];
      for (const [domain, domainSkills] of Object.entries(domainGroups)) {
        lines.push(`**${domain}:**`);
        for (const skill of domainSkills) {
          lines.push(`  - ${skill.namespace} (${skill.name}): ${skill.description}`);
        }
      }

      return `Found ${matches.length} skill(s):\n${lines.join('\n')}`;
    },
  });

  return { invokeSkillTool, readSkillToolsTool, discoverSkillsTool };
};
