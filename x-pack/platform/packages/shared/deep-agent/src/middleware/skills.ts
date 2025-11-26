/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Middleware for providing skills discovery and invocation to an agent.
 *
 * Provides discover_skills and invoke_skill tools with support for:
 * - Skills registry integration
 * - Skill discovery by query/category
 * - Dynamic skill invocation
 */

import { createMiddleware, tool } from 'langchain';
import { z as z3 } from 'zod/v3';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillDefinition, SkillsRegistry, ToolHandlerContext } from '@kbn/onechat-server';

const SKILLS_SYSTEM_PROMPT = `You have access to skills - capabilities registered by Kibana plugins that are not directly available as tools.

Skills are discovered and invoked on-demand to avoid context limit issues. Use the discover_skills tool to find relevant skills, then use invoke_skill to execute them.

Skills are organized by categories (e.g., "security", "observability", "data") and can be searched by description or name.`;

/**
 * Create skills middleware with discovery and invocation tools.
 */
export function createSkillsMiddleware(options: {
  getSkillsRegistry: (request: KibanaRequest) => Promise<SkillsRegistry>;
  getRequest: () => KibanaRequest;
  getToolHandlerContext?: () => ToolHandlerContext;
}) {
  const { getSkillsRegistry, getRequest, getToolHandlerContext } = options;

  const discoverSkillsTool = tool(
    async (input: { query: string; category?: string }): Promise<string> => {
      const { query, category } = input;
      const request = getRequest();
      const skillsRegistry = await getSkillsRegistry(request);
      const matchingSkills = skillsRegistry.search(query, category);

      if (matchingSkills.length === 0) {
        return `No skills found matching "${query}"${
          category ? ` in category "${category}"` : ''
        }.`;
      }

      const skillsInfo = matchingSkills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        examples: skill.examples,
      }));

      return `Found ${matchingSkills.length} matching skill(s):\n\n${JSON.stringify(
        skillsInfo,
        null,
        2
      )}`;
    },
    {
      name: 'discover_skills',
      description:
        'Search for available skills by query and optional category. Returns matching skills with their IDs, descriptions, and examples.',
      schema: z3.object({
        query: z3
          .string()
          .describe('Search query to find skills (searches in name, description, category)'),
        category: z3
          .string()
          .optional()
          .describe("Optional category filter (e.g., 'security', 'observability')"),
      }),
    }
  );

  const invokeSkillTool = tool(
    async (input: { skillId: string; params?: Record<string, unknown> }): Promise<string> => {
      const { skillId, params = {} } = input;
      const request = getRequest();
      const skillsRegistry = await getSkillsRegistry(request);
      let skill = await skillsRegistry.get(skillId);

      // If skill not found, try fuzzy matching (e.g., "observability_alerts" -> "observability.get_alerts")
      if (!skill) {
        const allSkills = await skillsRegistry.list();
        // Try to find a skill with similar ID (replace underscores with dots, or vice versa)
        const normalizedSkillId = skillId.replace(/_/g, '.');
        const reverseNormalized = skillId.replace(/\./g, '_');
        
        skill = allSkills.find(
          (s) =>
            s.id === normalizedSkillId ||
            s.id === reverseNormalized ||
            s.id.toLowerCase() === skillId.toLowerCase() ||
            s.id.replace(/\./g, '_') === skillId ||
            s.id.replace(/_/g, '.') === skillId
        );

        if (!skill) {
          // Find skills with similar names or IDs
          const similarSkills = allSkills.filter(
            (s) =>
              s.id.toLowerCase().includes(skillId.toLowerCase()) ||
              skillId.toLowerCase().includes(s.id.toLowerCase()) ||
              s.name.toLowerCase().includes(skillId.toLowerCase())
          );

          let errorMessage = `Error: Skill with id "${skillId}" not found.\n\n`;
          
          if (similarSkills.length > 0) {
            errorMessage += `Did you mean one of these?\n${similarSkills
              .map((s) => `  - ${s.id} (${s.name})`)
              .join('\n')}\n\n`;
          }
          
          errorMessage += `Use discover_skills to find all available skills.`;
          return errorMessage;
        }
      }

      try {
        // Validate params against skill's input schema if it exists
        let validatedParams = params;
        if (skill.inputSchema) {
          const validationResult = skill.inputSchema.safeParse(params);
          if (!validationResult.success) {
            return `Error: Invalid parameters for skill "${skillId}": ${validationResult.error.message}`;
          }
          validatedParams = validationResult.data;
        }

        // Execute the skill handler
        // Use full tool handler context if available, otherwise just request
        const context = getToolHandlerContext ? getToolHandlerContext() : { request };
        const result = await skill.handler(validatedParams, context);

        // If result is an empty array, return a user-friendly message
        if (Array.isArray(result) && result.length === 0) {
          return 'No results';
        }

        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error executing skill "${skillId}": ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
    {
      name: 'invoke_skill',
      description:
        'Invoke a specific skill by ID with the provided parameters. Use discover_skills first to find the skill ID.',
      schema: z3.object({
        skillId: z3.string().describe('The ID of the skill to invoke'),
        params: z3
          .record(z3.unknown())
          .optional()
          .describe('Parameters to pass to the skill handler'),
      }),
    }
  );

  return createMiddleware({
    name: 'SkillsMiddleware',
    systemPrompt: SKILLS_SYSTEM_PROMPT,
    tools: [discoverSkillsTool, invokeSkillTool],
  });
}
