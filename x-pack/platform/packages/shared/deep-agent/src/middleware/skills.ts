/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMiddleware, tool } from 'langchain';
import { z as z3 } from 'zod/v3';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerContext, SkillDefinition, SkillsRegistry } from '@kbn/onechat-server';

/**
 * Options for creating the skills middleware
 */
export interface SkillsMiddlewareOptions {
  /**
   * Function to get the skills registry for a given request
   */
  getSkillsRegistry: (request: KibanaRequest) => Promise<SkillsRegistry> | SkillsRegistry;
  /**
   * Function to get the current request
   */
  getRequest: () => KibanaRequest;
  /**
   * Function to get the tool handler context
   */
  getToolHandlerContext: () => ToolHandlerContext;
}

/**
 * Create middleware that provides discover_skills and invoke_skill tools
 */
export function createSkillsMiddleware(options: SkillsMiddlewareOptions): ReturnType<typeof createMiddleware> {
  const { getSkillsRegistry, getRequest, getToolHandlerContext } = options;

  const discoverSkillsTool = tool(
    async (input) => {
      const { query = '*', category } = input;
      const request = getRequest();
      const registry = await getSkillsRegistry(request);
      const skills = registry.search(query, category);

      if (skills.length === 0) {
        return `No skills found matching "${query}"${category ? ` in category "${category}"` : ''}.`;
      }

      return JSON.stringify(
        skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          examples: skill.examples,
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
      const request = getRequest();
      const registry = await getSkillsRegistry(request);
      const skill = registry.get(skillId);

      if (!skill) {
        const allSkills = await registry.list();
        // Try to find a skill with similar ID (replace underscores with dots, or vice versa)
        const normalizedSkillId = skillId.replace(/_/g, '.');
        const reverseNormalized = skillId.replace(/\./g, '_');

        const foundSkill = allSkills.find(
          (s) =>
            s.id === normalizedSkillId ||
            s.id === reverseNormalized ||
            s.id.toLowerCase() === skillId.toLowerCase() ||
            s.id.replace(/\./g, '_') === skillId ||
            s.id.replace(/_/g, '.') === skillId
        );

        if (!foundSkill) {
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
              .map((s) => `- "${s.id}" (${s.name})`)
              .join('\n')}\n\n`;
          }
          errorMessage += `Use discover_skills to find available skills.`;
          return errorMessage;
        }

        // Use the found skill
        const context = getToolHandlerContext();
        const result = await foundSkill.handler(params, context);
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
        const context = getToolHandlerContext();
        const result = await skill.handler(validatedParams, context);

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
    tools: [discoverSkillsTool, invokeSkillTool],
  });
}

