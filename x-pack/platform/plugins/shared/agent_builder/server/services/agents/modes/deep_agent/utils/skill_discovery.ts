/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Skill Discovery Utilities
 *
 * This module provides utilities for discovering, filtering, and managing
 * OneChat skills within the agent execution context. It includes:
 *
 * - **Skill discovery**: Search and rank skills by relevance to a query
 * - **Context management**: Track skill invocations and cache schemas
 * - **Prompt generation**: Create skill-aware system prompts and summaries
 * - **Tool extraction**: Extract tool metadata from skills for presentation
 *
 * @module skill_discovery
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import zodToJsonSchema from 'zod-to-json-schema';

/**
 * Represents a discovered skill with its tools and relevance metadata.
 *
 * Used by the discover_skills tool to present search results to the agent
 * with information about matching skills and their capabilities.
 */
export interface DiscoveredSkill {
  namespace: string;
  name: string;
  description: string;
  toolCount: number;
  tools: DiscoveredTool[];
  relevanceScore?: number;
}

/**
 * Represents a tool within a skill.
 *
 * Contains the essential metadata needed to present tool capabilities
 * to the agent without requiring the full tool implementation.
 */
export interface DiscoveredTool {
  name: string;
  description: string;
  schema?: unknown;
}

/**
 * Context preserved between tool executions during a conversation.
 *
 * This context enables the agent to maintain awareness of:
 * - Which skill is currently being used
 * - Which skills have been discovered/used in the session
 * - Recent invocation history for context
 * - Cached schemas for performance
 *
 * The context is persisted in the graph state and updated via reducers.
 */
export interface SkillContext {
  /** Currently active skill namespace */
  activeSkillNamespace?: string;
  /** Skills that have been discovered/used in this session */
  discoveredSkills: Set<string>;
  /** Tool invocation history for context */
  invocationHistory: SkillInvocation[];
  /** Cached skill tool schemas for quick access */
  cachedSchemas: Map<string, unknown>;
}

/**
 * Records a single skill tool invocation for history tracking.
 *
 * Invocation records are kept in the SkillContext to provide
 * the agent with awareness of what has been attempted and
 * whether operations succeeded or failed.
 */
export interface SkillInvocation {
  skillNamespace: string;
  toolName: string;
  timestamp: number;
  success: boolean;
  resultSummary?: string;
}

/**
 * Creates an empty skill context
 */
export function createSkillContext(): SkillContext {
  return {
    activeSkillNamespace: undefined,
    discoveredSkills: new Set(),
    invocationHistory: [],
    cachedSchemas: new Map(),
  };
}

/**
 * Serializes skill context for state persistence
 */
export function serializeSkillContext(context: SkillContext): string {
  return JSON.stringify({
    activeSkillNamespace: context.activeSkillNamespace,
    discoveredSkills: Array.from(context.discoveredSkills),
    invocationHistory: context.invocationHistory.slice(-20), // Keep last 20 invocations
    cachedSchemas: Array.from(context.cachedSchemas.entries()),
  });
}

/**
 * Deserializes skill context from persisted state
 */
export function deserializeSkillContext(serialized: string): SkillContext {
  try {
    const parsed = JSON.parse(serialized);
    return {
      activeSkillNamespace: parsed.activeSkillNamespace,
      discoveredSkills: new Set(parsed.discoveredSkills || []),
      invocationHistory: parsed.invocationHistory || [],
      cachedSchemas: new Map(parsed.cachedSchemas || []),
    };
  } catch {
    return createSkillContext();
  }
}

/**
 * Records a skill invocation in the context
 */
export function recordSkillInvocation(
  context: SkillContext,
  invocation: Omit<SkillInvocation, 'timestamp'>
): SkillContext {
  return {
    ...context,
    activeSkillNamespace: invocation.skillNamespace,
    discoveredSkills: new Set([...context.discoveredSkills, invocation.skillNamespace]),
    invocationHistory: [
      ...context.invocationHistory,
      { ...invocation, timestamp: Date.now() },
    ].slice(-50), // Keep last 50 invocations
  };
}

/**
 * Discovers skills from a list based on a query/keywords
 */
export function discoverSkills(skills: Skill[], query?: string): DiscoveredSkill[] {
  const discovered = skills.map((skill) => {
    const tools = extractToolsFromSkill(skill);
    let relevanceScore = 1;

    if (query) {
      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/);

      // Calculate relevance based on keyword matches
      let matches = 0;
      const searchableText =
        `${skill.namespace} ${skill.name} ${skill.description} ${skill.content}`.toLowerCase();

      for (const keyword of keywords) {
        if (searchableText.includes(keyword)) {
          matches++;
        }
      }

      relevanceScore = matches / keywords.length;
    }

    return {
      namespace: skill.namespace,
      name: skill.name,
      description: skill.description,
      toolCount: tools.length,
      tools,
      relevanceScore,
    };
  });

  // Sort by relevance score descending
  return discovered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Extracts tool information from a skill
 */
export function extractToolsFromSkill(skill: Skill): DiscoveredTool[] {
  return skill.tools.map((tool) => {
    let schema: unknown;
    try {
      schema = zodToJsonSchema((tool as any).schema, { $refStrategy: 'none' });
    } catch {
      schema = undefined;
    }

    return {
      name: tool.name,
      description: tool.description || '',
      schema,
    };
  });
}

/**
 * Generates skill-specific prompting with tool schemas
 */
export function generateSkillPrompt(skill: Skill, includeSchemas: boolean = false): string {
  const tools = extractToolsFromSkill(skill);
  const toolsSection = tools
    .map((tool) => {
      let toolEntry = `- **${tool.name}**: ${tool.description}`;
      if (includeSchemas && tool.schema) {
        toolEntry += `\n  Schema: \`${JSON.stringify(tool.schema, null, 2)}\``;
      }
      return toolEntry;
    })
    .join('\n');

  return `## Skill: ${skill.name} (${skill.namespace})

${skill.description}

### Available Tools (${tools.length})
${toolsSection}

### Usage
To invoke a tool from this skill, use:
\`invoke_skill({ name: "<tool_name>", parameters: { ... } })\`
`;
}

/**
 * Generates a compact skill summary for system prompts
 */
export function generateSkillSummary(skills: Skill[]): string {
  if (skills.length === 0) {
    return 'No skills are currently available.';
  }

  const skillSummaries = skills.map((skill) => {
    const toolCount = skill.tools.length;
    return `- **${skill.namespace}** (${toolCount} tools): ${skill.description}`;
  });

  return `## Available Skills (${skills.length})

${skillSummaries.join('\n')}

Use \`read_skill_tools\` to get detailed tool information for a specific skill.
Use \`invoke_skill\` to execute skill tools.`;
}

/**
 * Gets the tool schema for a specific tool in a skill
 */
export function getToolSchema(skills: Skill[], toolName: string): unknown | undefined {
  for (const skill of skills) {
    const tool = skill.tools.find((t) => t.name === toolName);
    if (tool) {
      try {
        return zodToJsonSchema((tool as any).schema, { $refStrategy: 'none' });
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Finds which skill a tool belongs to
 */
export function findSkillForTool(skills: Skill[], toolName: string): Skill | undefined {
  return skills.find((skill) => skill.tools.some((t) => t.name === toolName));
}

/**
 * Groups skills by domain/category based on namespace patterns
 */
export function groupSkillsByDomain(skills: Skill[]): Record<string, Skill[]> {
  const grouped: Record<string, Skill[]> = {};

  for (const skill of skills) {
    // Extract domain from namespace (e.g., "security.alerts" -> "security")
    const domain = skill.namespace.split('.')[0] || 'other';

    if (!grouped[domain]) {
      grouped[domain] = [];
    }
    grouped[domain].push(skill);
  }

  return grouped;
}
