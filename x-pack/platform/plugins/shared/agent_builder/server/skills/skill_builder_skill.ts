/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod';
import { createClient } from '../services/skills/client';

const getSkillClient = (context: {
  esClient: IScopedClusterClient;
  spaceId: string;
  logger: Logger;
}) =>
  createClient({
    space: context.spaceId,
    esClient: context.esClient.asInternalUser,
    logger: context.logger,
  });

const toJsonResult = (data: unknown) => ({
  results: [
    {
      type: ToolResultType.other as const,
      data: { message: JSON.stringify(data, null, 2) },
    },
  ],
});

const toErrorResult = (error: unknown) => ({
  results: [
    {
      type: ToolResultType.error as const,
      data: {
        message: error instanceof Error ? error.message : String(error),
      },
    },
  ],
});

export const skillBuilderSkill = defineSkillType({
  id: 'skill-builder',
  name: 'skill-builder',
  basePath: 'skills/platform',
  description:
    'Create, update, list, and delete custom user skills directly from the chat conversation.',
  content: `# Skill Builder

## WHEN TO USE THIS SKILL (REQUIRED)

You MUST use this skill when the user wants to:
- **Create** a new custom skill ("create a skill", "make a skill for X", "build a skill")
- **Update** an existing custom skill ("edit skill", "change skill content", "update my skill")
- **Delete** a custom skill ("remove skill", "delete skill X")
- **List** their custom skills ("show my skills", "what skills exist", "list skills")
- **View** a specific skill's details ("show me skill X", "get skill details")

**CRITICAL: If the user mentions creating, editing, managing, or building skills, you MUST use the skill-builder tools.**
**NEVER describe how to create skills without actually using the tools to do it.**

## PROCESS

### Creating a Skill

1. **Gather requirements** — Ask the user:
   - What should the skill do? (purpose)
   - What domain does it cover? (e.g., security, observability, search)
   - Should it reference any existing tools?

2. **Generate the skill definition**:
   - **id**: Lowercase kebab-case, descriptive, max 64 chars (e.g., \`log-analysis\`, \`incident-response\`)
   - **name**: Same as id — lowercase with hyphens, no spaces
   - **description**: One concise sentence (max 1024 chars) explaining what the skill does
   - **content**: Well-structured Markdown following the **Skill Content Template** below
   - **tool_ids**: Array of builtin tool IDs the skill should have access to (max 5). Leave empty if skill is guidance-only.

3. **Create** using \`platform.skill-builder.create-skill\`

4. **Confirm** success to the user and explain how the skill will be used

### Skill Content Template (MANDATORY)

Skill content is the **primary mechanism** for controlling agent behavior when the skill is active.
Every skill you create **MUST** follow this template structure. Omitting any required section
produces a low-quality skill that will perform poorly across different models.

\`\`\`markdown
# [Skill Name]

## Overview
[1-2 sentences describing what this skill helps with]

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user mentions ANY of these:
- [keyword or phrase 1]
- [keyword or phrase 2]
- [keyword or phrase 3]
- Any request involving [topic/operation]

**CRITICAL: If the question involves [topic], you MUST call this tool.**
**NEVER answer a [topic] question without calling the tool first.**

## Process
### 1. [First Step]
- [Details and parameter expectations]
### 2. [Second Step]
- [Details]
### 3. [Final Step]
- [Details]

## Response format (CRITICAL)

After executing, respond **directly and concisely**:

1. [First thing to state — e.g., count of results]
2. [How to present data — e.g., table or list format]
3. [Only fields directly relevant to the query]

**DO include**:
- [Specific data the response must contain]
- [Format requirements — tables, lists, etc.]

**DO NOT include**:
- Explanations of how the tool works internally
- Follow-up suggestions unless requested
- Disclaimers or caveats about results
- Background information not from tool results

## FORBIDDEN RESPONSES (will cause evaluation failure)
- "[Topic] is a tool/feature that allows you to..."
- Any explanation or description not directly from tool results
- Setup instructions or configuration suggestions
- Mentioning internal implementation details
\`\`\`

### Required sections checklist for every skill you create:

1. **WHEN TO USE THIS TOOL** — explicit trigger keywords and a CRITICAL mandate
2. **Process** — step-by-step instructions with clear parameter expectations
3. **Response format (CRITICAL)** — explicit DO/DON'T for what to include
4. **FORBIDDEN RESPONSES** — concrete examples of disallowed output

### Content quality rules:

- **Be behavioral, not educational**: write instructions the agent follows, not explanations of how things work
- **Be specific**: name exact fields, formats, and constraints — never say "relevant information"
- **Prefer structured output**: instruct the agent to respond with tables/lists, not prose
- **Avoid model-dependent phrasing**: never use "think step by step" or "use chain-of-thought"
- **Constrain, don't suggest**: use "MUST", "NEVER", "CRITICAL" — not "consider", "might", "could"
- **If the skill uses tools**: specify required parameters explicitly and say "if parameter X is missing, ask the user for X" — never let the agent hallucinate tool arguments

### Updating a Skill

1. List skills first to find the ID
2. Get the current skill to see what exists
3. Apply the requested changes
4. Update using \`platform.skill-builder.update-skill\`

### Deleting a Skill

1. Confirm with the user before deleting
2. Delete using \`platform.skill-builder.delete-skill\`

## Response format (CRITICAL)

After each tool call, respond **directly and concisely**:

**After creating**: "Created skill **[name]** (\`[id]\`). [Brief description of what it does]."
**After updating**: "Updated skill **[name]** — [what changed]."
**After deleting**: "Deleted skill \`[id]\`."
**After listing**: Show a table with id, name, and description columns.
**After getting**: Show the full skill definition formatted clearly.

## FORBIDDEN RESPONSES

- Do NOT explain how the skills system works internally
- Do NOT suggest creating skills via the UI when the user asked to do it from chat
- Do NOT hallucinate tool IDs — only reference tools that actually exist
- Do NOT create skills with empty or placeholder content
- Do NOT create skills missing the required sections (WHEN TO USE, Response format, FORBIDDEN RESPONSES)
- Do NOT include follow-up suggestions unless the user asks
- Do NOT use vague language ("relevant data", "appropriate format") — be specific`,
  getInlineTools: () => [
    {
      id: 'platform.skill-builder.list-skills',
      type: ToolType.builtin,
      description: 'List all available skills (both built-in and user-created)',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const client = getSkillClient(context);
          const skills = await client.list();
          const summary = skills.map(({ id, name, description }) => ({
            id,
            name,
            description,
          }));
          return toJsonResult({ count: summary.length, skills: summary });
        } catch (error) {
          return toErrorResult(error);
        }
      },
    },
    {
      id: 'platform.skill-builder.get-skill',
      type: ToolType.builtin,
      description: 'Get the full details of a specific skill by its ID',
      schema: z.object({
        skill_id: z.string().describe('The ID of the skill to retrieve'),
      }),
      handler: async ({ skill_id: skillId }, context) => {
        try {
          const client = getSkillClient(context);
          const skill = await client.get(skillId);
          return toJsonResult(skill);
        } catch (error) {
          return toErrorResult(error);
        }
      },
    },
    {
      id: 'platform.skill-builder.create-skill',
      type: ToolType.builtin,
      description:
        'Create a new user-defined skill with an ID, name, description, content (Markdown instructions), and optional tool associations',
      schema: z.object({
        id: z
          .string()
          .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/)
          .max(64)
          .describe(
            'Unique skill ID — lowercase alphanumeric with hyphens/underscores, max 64 chars (e.g., "log-analysis")'
          ),
        name: z
          .string()
          .max(64)
          .describe('Display name for the skill — lowercase with hyphens, same format as id'),
        description: z
          .string()
          .max(1024)
          .describe('Brief description of what the skill does (max 1024 chars)'),
        content: z
          .string()
          .min(1)
          .describe(
            'Markdown instructions that guide agent behavior when this skill is active. Should include overview, process steps, response format, and constraints.'
          ),
        tool_ids: z
          .array(z.string())
          .max(5)
          .default([])
          .describe(
            'IDs of builtin tools this skill should have access to (max 5). Leave empty for guidance-only skills.'
          ),
      }),
      handler: async (params, context) => {
        try {
          const client = getSkillClient(context);
          const skill = await client.create({
            id: params.id,
            name: params.name,
            description: params.description,
            content: params.content,
            tool_ids: params.tool_ids,
          });
          return toJsonResult({ status: 'created', skill });
        } catch (error) {
          return toErrorResult(error);
        }
      },
    },
    {
      id: 'platform.skill-builder.update-skill',
      type: ToolType.builtin,
      description: 'Update an existing user-created skill. Only provided fields are changed.',
      schema: z.object({
        skill_id: z.string().describe('The ID of the skill to update'),
        name: z.string().max(64).optional().describe('New display name'),
        description: z.string().max(1024).optional().describe('New description'),
        content: z.string().min(1).optional().describe('New Markdown content/instructions'),
        tool_ids: z
          .array(z.string())
          .max(5)
          .optional()
          .describe('New list of associated tool IDs'),
      }),
      handler: async ({ skill_id: skillId, ...updates }, context) => {
        try {
          const client = getSkillClient(context);
          const skill = await client.update(skillId, updates);
          return toJsonResult({ status: 'updated', skill });
        } catch (error) {
          return toErrorResult(error);
        }
      },
    },
    {
      id: 'platform.skill-builder.delete-skill',
      type: ToolType.builtin,
      description: 'Permanently delete a user-created skill by its ID',
      schema: z.object({
        skill_id: z.string().describe('The ID of the skill to delete'),
      }),
      handler: async ({ skill_id: skillId }, context) => {
        try {
          const client = getSkillClient(context);
          await client.delete(skillId);
          return toJsonResult({ status: 'deleted', skill_id: skillId });
        } catch (error) {
          return toErrorResult(error);
        }
      },
    },
  ],
});
