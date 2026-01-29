/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Skill Middleware for Deep Agent
 *
 * This module provides middleware and tools for integrating OneChat skills into
 * the deep agent's execution flow. It enables:
 *
 * - **Progressive skill disclosure**: Skills are presented to the agent through
 *   system prompts and can be discovered dynamically via tool calls.
 *
 * - **Skill tool invocation**: The `invoke_skill` tool allows the agent to
 *   execute skill tools by name with validated parameters.
 *
 * - **Skill discovery**: The `discover_skills` and `read_skill_tools` tools
 *   enable the agent to find and understand available skills before invocation.
 *
 * - **Error handling**: Provides structured error responses with truncated schemas
 *   and minimal examples for LLM self-correction.
 *
 * @module skillMiddleware
 */

import type { FileData } from '@kbn/langchain-deep-agent';
import type { AgentEventEmitter } from '@kbn/agent-builder-server/agents';
import type { DynamicStructuredTool } from 'langchain';
import { AIMessage, createMiddleware, tool, ToolMessage } from 'langchain';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { z } from '@kbn/zod';
import { v4 as uuidv4 } from 'uuid';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import zodToJsonSchema from 'zod-to-json-schema';
import type { Skill } from '@kbn/agent-builder-common/skills';
import {
  generateSkillSummary,
  groupSkillsByDomain,
  discoverSkills,
  toCompactJson,
  truncateSchema,
  generateMinimalExample,
} from '../utils';

/**
 * Creates middleware that injects skill information into the system prompt.
 *
 * This middleware enables progressive disclosure of skills to the agent by:
 * - Adding a skill overview section to the system prompt
 * - Organizing skills by domain for easier discovery
 * - Providing instructions on how to use skill discovery tools
 *
 * The agent can then decide to read full skill documentation from the
 * virtual file system when required for a specific task.
 *
 * @param events - Event emitter for agent events
 * @param skills - Map of skill files available in the virtual file system
 * @param skillsList - Optional array of parsed Skill objects for enhanced prompting
 * @returns LangChain middleware that enhances the system prompt
 *
 * @example
 * ```ts
 * const middleware = createSkillSystemPromptMiddleware(events, skillFiles, skills);
 * const model = chatModel.use(middleware);
 * ```
 */
export const createSkillSystemPromptMiddleware = (
  events: AgentEventEmitter,
  skills: Record<string, FileData>,
  skillsList?: Skill[]
) => {
  return createMiddleware({
    name: 'skillSystemPromptMiddleware',
    wrapModelCall: (request, handler) => {
      // Generate a compact skill summary if skills are provided
      const skillSummary = skillsList?.length ? generateSkillSummary(skillsList) : '';

      // Generate domain groupings for better organization
      const domainGroups = skillsList?.length
        ? Object.entries(groupSkillsByDomain(skillsList))
          .map(([domain, domainSkills]) => `  - ${domain}: ${domainSkills.length} skills`)
          .join('\n')
        : '';

      const skillSystemPrompt = `## Agent Skills (required)
- Skills live under \`/skills\`.
- Before acting, discover relevant skills with \`grep\` over \`/skills\`, then \`read_file\` the best 1–3 matches.
- Prefer \`invoke_skill\` (skill tool name) over calling tools directly.
- Use \`discover_skills\` to find skills by keywords when unsure which skill to use.
- Use \`read_skill_tools\` to get detailed tool schemas before invoking.

### Skill Domains Available
${domainGroups || '  - No skills currently available'}

${skillSummary}`;

      return handler({
        ...request,
        systemPrompt:
          (request.systemPrompt ? `${request.systemPrompt}\n\n` : '') + skillSystemPrompt,
      });
    },
  });
};

/**
 * Creates the skill interaction tools for the agent.
 *
 * Returns three tools that enable skill-based interactions:
 *
 * - **invoke_skill**: Executes a skill tool by name with parameters.
 *   Handles errors with truncated schemas for self-correction.
 *
 * - **read_skill_tools**: Lists tools available in a skill or all skills.
 *   Optionally includes JSON schemas for tool parameters.
 *
 * - **discover_skills**: Searches for skills by keywords or domain.
 *   Returns skills ranked by relevance to the query.
 *
 * @param skills - Array of available Skill objects
 * @param events - Event emitter for agent events
 * @param skillToolContext - Context passed to skill tool handlers (excludes resultStore)
 * @returns Object containing invokeSkillTool, readSkillToolsTool, and discoverSkillsTool
 *
 * @example
 * ```ts
 * const { invokeSkillTool, readSkillToolsTool, discoverSkillsTool } =
 *   createSkillTools(skills, events, context);
 *
 * // Add to agent's available tools
 * const allTools = [...baseTools, invokeSkillTool, readSkillToolsTool, discoverSkillsTool];
 * ```
 */
export const createSkillTools = (
  skills: Skill[],
  events: AgentEventEmitter,
  skillToolContext: Omit<ToolHandlerContext, 'resultStore'>
) => {
  // Flatten all tools from all skills
  const allTools: DynamicStructuredTool[] = skills.flatMap((skill) => skill.tools);
  const toolNode = new ToolNode(allTools);
  const toolByName = new Map(allTools.map((t) => [t.name, t]));

  // Build a mapping of skill namespace to tool info
  const skillToolMapping = new Map<
    string,
    { name: string; description: string; schema: unknown }[]
  >();
  for (const skill of skills) {
    const toolInfos = skill.tools.map((t) => {
      let schema: unknown;
      try {
        schema = zodToJsonSchema((t as any).schema, { $refStrategy: 'none' });
      } catch (_e) {
        schema = undefined;
      }
      return {
        name: t.name,
        description: t.description ?? '',
        schema,
      };
    });
    skillToolMapping.set(skill.namespace, toolInfos);
  }

  // Build a reverse mapping: tool name -> skill namespace
  const toolToSkillMap = new Map<string, string>();
  for (const skill of skills) {
    for (const t of skill.tools) {
      toolToSkillMap.set(t.name, skill.namespace);
    }
  }

  const selectOperationSchema = (jsonSchema: any, operation?: string) => {
    if (!operation) return jsonSchema;
    const candidates: any[] = jsonSchema?.oneOf ?? jsonSchema?.anyOf ?? [];
    if (!Array.isArray(candidates) || candidates.length === 0) return jsonSchema;

    const match = candidates.find((candidate) => {
      const op = candidate?.properties?.operation;
      if (!op) return false;
      if (op.const && op.const === operation) return true;
      if (Array.isArray(op.enum) && op.enum.includes(operation)) return true;
      return false;
    });

    // If we found a specific op branch, return only that branch schema to keep the payload small & actionable.
    return match ?? jsonSchema;
  };


  const getExpectedSchemaForTool = (toolName: string) => {
    const t = toolByName.get(toolName);
    const schema = (t as any)?.schema;
    if (!schema) return undefined;
    try {
      // Note: many skill tools use pass-through object schemas; this stays compact.
      return zodToJsonSchema(schema, { $refStrategy: 'none' });
    } catch (_e) {
      return undefined;
    }
  };

  /**
   * Tool to discover skills by keywords or domain.
   * This enables intelligent skill discovery based on the user's query.
   */
  const discoverSkillsTool = tool(
    async ({ query, domain, limit }) => {
      let filteredSkills = skills;

      // Filter by domain if specified
      if (domain) {
        const domainGroups = groupSkillsByDomain(skills);
        filteredSkills = domainGroups[domain] || [];
        if (filteredSkills.length === 0) {
          const availableDomains = Object.keys(domainGroups).sort();
          return toCompactJson({
            error: {
              message: `Domain "${domain}" not found.`,
              domain,
            },
            available_domains: availableDomains,
          });
        }
      }

      // Discover skills based on query
      const discovered = discoverSkills(filteredSkills, query);
      const limitedResults = discovered.slice(0, limit);

      // Generate detailed information for top results
      const results = limitedResults.map((skill) => {
        const fullSkill = skills.find((s) => s.namespace === skill.namespace);
        return {
          namespace: skill.namespace,
          name: skill.name,
          description: skill.description,
          tool_count: skill.toolCount,
          relevance_score: skill.relevanceScore,
          tools: skill.tools.slice(0, 5).map((t) => ({
            name: t.name,
            description: t.description,
          })),
          usage_hint: fullSkill
            ? `Use invoke_skill({ name: "${skill.tools[0]?.name || '<tool_name>'
            }", parameters: { ... } }) to invoke tools from this skill.`
            : undefined,
        };
      });

      // Include domain summary
      const domainSummary = Object.entries(groupSkillsByDomain(skills)).map(
        ([d, domainSkills]) => ({
          domain: d,
          skill_count: domainSkills.length,
        })
      );

      return toCompactJson({
        query: query || null,
        domain: domain || null,
        total_skills: skills.length,
        matching_skills: discovered.length,
        results_returned: results.length,
        domain_summary: domainSummary,
        skills: results,
      });
    },
    {
      name: 'discover_skills',
      description:
        'Discover available skills by keywords or domain. Use this to find relevant skills before invoking them. ' +
        'Returns skills ranked by relevance to the query.',
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            'Keywords to search for in skill names, descriptions, and content (e.g. "security alerts", "risk score", "detection rules").'
          ),
        domain: z
          .string()
          .optional()
          .describe(
            'Filter skills by domain/category (e.g. "security", "platform", "observability"). If not provided, searches all domains.'
          ),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of skills to return. Defaults to 10.'),
      }),
    }
  );

  const skillExecutorTool = tool(
    async ({ name, parameters }, config) => {
      // Create a message with the tool call that can be used to invoke the toolNode.
      const messageWithToolCalls = new AIMessage({
        tool_calls: [
          {
            id: uuidv4(), // doesnt really matter what this is. The skillExecutorTool return will use the tool_call_id from the config.
            name,
            args: parameters,
          },
        ],
      });

      // If the tool doesn't exist in the currently enabled skills, return a helpful error.
      if (!toolByName.has(name)) {
        const available = Array.from(toolByName.keys()).sort();
        // Find the skill this tool might belong to for better guidance
        const suggestedSkill = skills.find(
          (s) =>
            s.namespace.includes(name.split('.')[0]) ||
            s.name.toLowerCase().includes(name.split('.')[0])
        );

        return new ToolMessage({
          content: toCompactJson({
            error: {
              message: `Skill tool "${name}" not found in enabled skills.`,
              tool: name,
            },
            suggestion: suggestedSkill
              ? `Did you mean a tool from the "${suggestedSkill.namespace}" skill?`
              : 'Use discover_skills or read_skill_tools to find available tools.',
            available_tools_sample: available.slice(0, 50),
            available_tools_total: available.length,
          }),
          tool_call_id: config.toolCall.id,
          status: 'error',
        });
      }

      let toolMessage: ToolMessage | undefined;
      try {
        // Pass OneChat context to skill-tools via LangChain's configurable mechanism
        const result = (await toolNode.invoke([messageWithToolCalls], {
          configurable: { onechat: skillToolContext },
        })) as ToolMessage[];

        toolMessage = result.at(0);
      } catch (e: any) {
        const operation = (parameters as any)?.operation;
        const expectedSchemaFull = getExpectedSchemaForTool(name);
        const expectedSchema = expectedSchemaFull
          ? selectOperationSchema(
            expectedSchemaFull,
            typeof operation === 'string' ? operation : undefined
          )
          : undefined;
        const errorMessage = e?.message ?? String(e);

        // Find which skill this tool belongs to for context
        const skillNamespace = toolToSkillMap.get(name);

        // Truncate schema and generate minimal example for self-correction
        const truncatedSchema = expectedSchema ? truncateSchema(expectedSchema) : undefined;
        const minimalExample = expectedSchema ? generateMinimalExample(expectedSchema) : undefined;

        return new ToolMessage({
          content: toCompactJson({
            error: {
              message: errorMessage,
              tool: name,
              skill: skillNamespace,
            },
            ...(typeof operation === 'string' ? { operation } : {}),
            ...(truncatedSchema ? { expected_schema: truncatedSchema } : {}),
            ...(minimalExample ? { expected_params_example: minimalExample } : {}),
            hint: 'Fix the tool call arguments to match expected_schema and retry invoke_skill.',
          }),
          tool_call_id: config.toolCall.id,
          status: 'error',
        });
      }

      if (!toolMessage) {
        return 'Tool called';
      }

      // Check if this is a schema validation error from Zod and enrich it with helpful info
      const messageContent =
        typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content);

      const isSchemaError =
        toolMessage.status === 'error' ||
        messageContent.includes('did not match expected schema') ||
        messageContent.includes('Invalid input') ||
        messageContent.includes('Invalid discriminator');

      if (isSchemaError) {
        const operation = (parameters as any)?.operation;
        const expectedSchemaFull = getExpectedSchemaForTool(name);
        const expectedSchema = expectedSchemaFull
          ? selectOperationSchema(
            expectedSchemaFull,
            typeof operation === 'string' ? operation : undefined
          )
          : undefined;

        const skillNamespace = toolToSkillMap.get(name);
        const truncatedSchema = expectedSchema ? truncateSchema(expectedSchema) : undefined;
        const minimalExample = expectedSchema ? generateMinimalExample(expectedSchema) : undefined;

        // Find the skill for content reference
        const skill = skills.find((s) => s.namespace === skillNamespace);
        const hasContent = skill?.content && skill.content.length > 0;

        return new ToolMessage({
          content: toCompactJson({
            error: {
              message: messageContent,
              tool: name,
              skill: skillNamespace,
            },
            ...(typeof operation === 'string' ? { operation } : {}),
            ...(truncatedSchema ? { expected_schema: truncatedSchema } : {}),
            ...(minimalExample ? { expected_params_example: minimalExample } : {}),
            hint: hasContent
              ? `Fix the tool call arguments to match expected_schema. Use read_skill_tools("${skillNamespace}", include_content=true) to see usage examples.`
              : 'Fix the tool call arguments to match expected_schema and retry invoke_skill.',
          }),
          tool_call_id: config.toolCall.id,
          status: 'error',
        });
      }

      return new ToolMessage({
        content: toolMessage.content,
        artifact: toolMessage.artifact,
        contentBlocks: toolMessage.contentBlocks,
        status: toolMessage.status,
        tool_call_id: config.toolCall.id,
      });
    },
    {
      name: 'invoke_skill',
      description:
        'Invoke a skill tool (exposed by enabled skills) by name, with the provided parameters. ' +
        'Use discover_skills or read_skill_tools first to find available tools.',
      schema: z.object({
        name: z.string().describe('The skill tool name to invoke (e.g. "platform.core.search").'),
        parameters: z
          .object({})
          .passthrough()
          .describe('The parameters to pass to the skill tool.'),
      }),
    }
  );

  /**
   * Tool to read/list the tools available in a skill or all skills.
   */
  const readSkillToolsTool = tool(
    async ({ skill_namespace, include_schema, include_content }) => {
      // If no specific skill is requested, return all skills with their tools
      if (!skill_namespace) {
        const allSkillsTools: Record<
          string,
          { name: string; description: string; schema?: unknown }[]
        > = {};
        for (const [namespace, toolInfos] of skillToolMapping.entries()) {
          allSkillsTools[namespace] = toolInfos.map((t) => ({
            name: t.name,
            description: t.description,
            ...(include_schema ? { schema: t.schema } : {}),
          }));
        }
        return toCompactJson({
          skills_count: skillToolMapping.size,
          tools_count: allTools.length,
          skills: allSkillsTools,
        });
      }

      // Return tools for a specific skill
      const toolInfos = skillToolMapping.get(skill_namespace);
      if (!toolInfos) {
        const availableSkills = Array.from(skillToolMapping.keys()).sort();
        return toCompactJson({
          error: {
            message: `Skill "${skill_namespace}" not found.`,
            skill: skill_namespace,
          },
          available_skills: availableSkills,
        });
      }

      // Get the full skill for additional context
      const skill = skills.find((s) => s.namespace === skill_namespace);

      return toCompactJson({
        skill: skill_namespace,
        name: skill?.name,
        description: skill?.description,
        tools_count: toolInfos.length,
        tools: toolInfos.map((t) => ({
          name: t.name,
          description: t.description,
          ...(include_schema ? { schema: t.schema } : {}),
        })),
        // Include skill content (markdown documentation with examples) when requested
        ...(include_content && skill?.content ? { content: skill.content } : {}),
        usage: `Use invoke_skill({ name: "<tool_name>", parameters: { ... } }) to invoke these tools.`,
      });
    },
    {
      name: 'read_skill_tools',
      description:
        'Read the tools available in a specific skill or list all skills with their tools. ' +
        'Use this to discover what tools are available and their schemas before invoking them with invoke_skill. ' +
        'Set include_content=true to get usage examples and documentation.',
      schema: z.object({
        skill_namespace: z
          .string()
          .optional()
          .describe(
            'The skill namespace to read tools from (e.g. "platform.search"). If not provided, returns all skills with their tools.'
          ),
        include_schema: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'Whether to include the JSON schema for each tool in the response. Defaults to false to keep response compact.'
          ),
        include_content: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            'Whether to include the skill documentation/examples (markdown content) in the response. Defaults to true. Contains usage examples and field guidance.'
          ),
      }),
    }
  );

  return {
    invokeSkillTool: skillExecutorTool,
    readSkillToolsTool,
    discoverSkillsTool,
  };
};

/**
 * @deprecated Use createSkillTools instead which returns invoke_skill, read_skill_tools, and discover_skills tools.
 * This function is kept for backward compatibility.
 */
export const createSkillToolExecutor = (
  tools: DynamicStructuredTool[],
  events: AgentEventEmitter,
  skillToolContext: Omit<ToolHandlerContext, 'resultStore'>
) => {
  // Create a minimal skill array from the tools (without namespace info)
  // This preserves backward compatibility but read_skill_tools/discover_skills won't have skill grouping
  const pseudoSkill: Skill = {
    namespace: 'unknown',
    name: 'Unknown',
    description: 'Backward compatibility skill',
    content: '',
    tools,
  };
  const { invokeSkillTool } = createSkillTools([pseudoSkill], events, skillToolContext);
  return invokeSkillTool;
};

/**
 * Returns all skill tools as an array for easy integration.
 *
 * Convenience function that wraps createSkillTools and returns
 * the tools as an array suitable for direct use with LangChain.
 *
 * @param skills - Array of available Skill objects
 * @param events - Event emitter for agent events
 * @param skillToolContext - Context passed to skill tool handlers
 * @returns Array of [invokeSkillTool, readSkillToolsTool, discoverSkillsTool]
 *
 * @example
 * ```ts
 * const skillTools = getSkillToolsArray(skills, events, context);
 * const model = chatModel.bindTools([...baseTools, ...skillTools]);
 * ```
 */
export const getSkillToolsArray = (
  skills: Skill[],
  events: AgentEventEmitter,
  skillToolContext: Omit<ToolHandlerContext, 'resultStore'>
) => {
  const { invokeSkillTool, readSkillToolsTool, discoverSkillsTool } = createSkillTools(
    skills,
    events,
    skillToolContext
  );
  return [invokeSkillTool, readSkillToolsTool, discoverSkillsTool];
};
