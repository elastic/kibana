/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMiddleware, tool } from 'langchain';
import { z as z3 } from 'zod/v3';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';

/**
 * Helper function to extract all SkillTool objects from Skill objects
 */
function getAllSkillTools(skills: Skill[]): SkillTool[] {
  const allTools: SkillTool[] = [];
  for (const skill of skills) {
    allTools.push(...skill.tools);
  }
  return allTools;
}

/**
 * Helper function to search SkillTool objects
 */
function searchSkillTools(tools: SkillTool[], query: string, category?: string): SkillTool[] {
  let filtered = tools;

  // Filter by category if provided
  if (category) {
    filtered = filtered.filter(
      (tool) => tool.categories && tool.categories.includes(category)
    );
  }

  // If query is empty or '*', return all
  if (!query || query === '*') {
    return filtered;
  }

  const lowerQuery = query.toLowerCase();
  return filtered.filter((tool) => {
    return (
      tool.id.toLowerCase().includes(lowerQuery) ||
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.shortDescription.toLowerCase().includes(lowerQuery) ||
      tool.fullDescription.toLowerCase().includes(lowerQuery) ||
      tool.examples?.some((example) => example.toLowerCase().includes(lowerQuery)) ||
      tool.categories?.some((cat) => cat.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Create middleware that provides discover_skills and invoke_skill tools
 */
export function createSkillsMiddleware(options: SkillsMiddlewareOptions): ReturnType<typeof createMiddleware> {
  const { getSkills, getRequest: _getRequest, getToolHandlerContext } = options;

  const discoverSkillsTool = tool(
    async (input) => {
      const { query = '*', category } = input;
      const skills = getSkills();
      const allTools = getAllSkillTools(skills);
      const matchingTools = searchSkillTools(allTools, query, category);

      if (matchingTools.length === 0) {
        return `No skills found matching "${query}"${category ? ` in category "${category}"` : ''}.`;
      }

      return JSON.stringify(
        matchingTools.map((tool) => ({
          id: tool.id,
          name: tool.name,
          shortDescription: tool.shortDescription,
        })),
        null,
        2
      );
    },
    {
      name: 'discover_skills',
      description: 'Discover available skills that can be invoked. Use "*" or empty query to list all skills.',
      schema: z3.object({
        query: z3.string().optional().describe('Search query to filter skills by name, description, or examples. Use "*" to list all.'),
        category: z3.string().optional().describe('Optional category filter'),
      }),
    }
  );

  const invokeSkillTool = tool(
    async (input) => {
      const { skillId, params = {} } = input;
      const skills = getSkills();
      const allTools = getAllSkillTools(skills);

      // Find the tool by ID
      let skillTool = allTools.find((tool) => tool.id === skillId);

      if (!skillTool) {
        // Try to find a skill with similar ID (replace underscores with dots, or vice versa)
        const normalizedSkillId = skillId.replace(/_/g, '.');
        const reverseNormalized = skillId.replace(/\./g, '_');

        skillTool = allTools.find(
          (tool: SkillTool) =>
            tool.id === normalizedSkillId ||
            tool.id === reverseNormalized ||
            tool.id.toLowerCase() === skillId.toLowerCase() ||
            tool.id.replace(/\./g, '_') === skillId ||
            tool.id.replace(/_/g, '.') === skillId
        );

        if (!skillTool) {
          // Find skills with similar names or IDs
          const similarTools = allTools.filter(
            (tool: SkillTool) =>
              tool.id.toLowerCase().includes(skillId.toLowerCase()) ||
              skillId.toLowerCase().includes(tool.id.toLowerCase()) ||
              tool.name.toLowerCase().includes(skillId.toLowerCase())
          );

          let errorMessage = `Error: Skill with id "${skillId}" not found.\n\n`;
          if (similarTools.length > 0) {
            errorMessage += `Did you mean one of these?\n${similarTools
              .map((tool: SkillTool) => `- "${tool.id}" (${tool.name})`)
              .join('\n')}\n\n`;
          }
          //errorMessage += `Use discover_skills to find available skills.`;
          return errorMessage;
        }
      }

      try {
        // Validate params against skill's input schema if it exists
        let validatedParams = params;
        if (skillTool.inputSchema) {
          const validationResult = skillTool.inputSchema.safeParse(params);
          if (!validationResult.success) {
            return `Error: Invalid parameters for skill "${skillId}": ${validationResult.error.message}`;
          }
          validatedParams = validationResult.data;
        }

        // Execute the skill handler
        const context = getToolHandlerContext();
        const result = await skillTool.handler(validatedParams, context);

        // If result is an empty array, return a user-friendly message
        if (Array.isArray(result) && result.length === 0) {
          return 'No results';
        }

        // Ensure we always return a string that, when parsed, creates a plain object
        if (typeof result === 'string') {
          // If it's already a string, try to parse and re-stringify to ensure it's valid JSON
          // that will create a plain object when parsed
          try {
            const parsed = JSON.parse(result);
            // Re-stringify to ensure it's a plain object structure
            return JSON.stringify(parsed, null, 2);
          } catch {
            // If it's not valid JSON, return as-is
            return result;
          }
        }
        if (result === null || result === undefined) {
          return 'No results';
        }
        try {
          // Use JSON.parse(JSON.stringify()) to ensure we create a plain object structure
          // This removes any methods, getters, setters, etc.
          const plainObject = JSON.parse(JSON.stringify(result));
          return JSON.stringify(plainObject, null, 2);
        } catch (e) {
          // Fallback for objects that can't be stringified (circular refs, etc.)
          return `Result: ${String(result)}`;
        }
      } catch (error) {
        return `Error executing skill "${skillId}": ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    {
      name: 'invoke_skill',
      description: 'Invoke a skill by its ID with the provided parameters.',
      schema: z3.object({
        skillId: z3.string().describe('The ID of the skill to invoke (e.g., "observability.get_alerts")'),
        params: z3.record(z3.any()).optional().describe('Parameters to pass to the skill handler'),
      }),
    }
  );

  return createMiddleware({
    name: 'skillsMiddleware',
    tools: [invokeSkillTool],
  });
}

