/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createLoadSkillForEditingTool } from './load_skill_for_editing';
import { createPatchSkillTool } from './patch_skill';

/**
 * Built-in skill that lets the user modify an existing Agent Builder skill
 * conversationally. When the user asks to edit a skill, the agent calls
 * `load_skill_for_editing` to fetch the current content and create a
 * `skill-edit` attachment, then iterates via `patch_skill`. Clicking
 * "Save changes" on the card calls `PUT /api/agent_builder/skills/:id` to
 * persist the changes.
 */
export const skillEditingSkill = defineSkillType({
  id: 'skill-editing',
  name: 'skill-editing',
  basePath: 'skills/platform/agent-builder',
  experimental: true,
  description:
    'Edit an existing Agent Builder skill from a chat description. Use when the user asks to update, modify, change, improve, or fix an existing skill.',
  content: dedent(`
## When to Use This Skill

Use this skill when:
- The user asks to "edit / update / modify / change / improve / fix" an existing skill.
- The user references a specific skill by name or id and wants to make changes to it.
- The user wants to add or remove tools from a skill they already own.

Do **not** use this skill when:
- The user wants to create a brand-new skill — use the skill-authoring skill instead.
- The user is asking about a built-in (readonly) skill — those cannot be edited via chat.
- The user only wants to read or understand a skill (just answer the question).

## Available Tools

After reading this SKILL.md, two inline tools become available:

- **load_skill_for_editing** — Fetches an existing user-created skill by id and creates a versioned \`skill-edit\` attachment pre-populated with its current content. Returns \`attachment_id\` and \`version\`. Must be called before any edits can be applied.
- **patch_skill** — Applies targeted edits to an existing draft attachment (rename, edit description, swap tool_ids, search-replace on \`content\` or referenced files, add/remove referenced files). Works on both \`skill\` and \`skill-edit\` attachments.

## Editing Workflow

1. **Identify the skill.**
   - If the user gave a skill id directly, use it.
   - If they gave a name or description, confirm the id before loading. Ask: "Is the skill id \`[guessed-id]\`? Or can you confirm the exact id?"
   - Do **not** guess an id and call \`load_skill_for_editing\` with it without confirming first — an incorrect id returns an error.

2. **Call \`load_skill_for_editing\`.**
   - Pass the confirmed skill id.
   - On success the tool returns \`attachment_id\` and \`version\`.

3. **Render the draft inline.**
   - Immediately emit \`<render_attachment id="ATTACHMENT_ID" />\` so the user sees the current content.
   - Briefly summarize what you loaded and what you plan to change.

4. **Understand the requested changes.**
   - If the user's request is clear, proceed to patch immediately.
   - If the request is vague ("make it better", "add the missing parts"), ask one focused question: what specifically should change?

5. **Apply changes via \`patch_skill\`.**
   - Use targeted search-replace patches rather than rewriting fields wholesale.
   - Prefer \`content_patches\` for surgical edits to the markdown body.
   - Use \`tool_ids\` replacement only when the full list is changing.
   - After each patch, re-render the attachment so the card refreshes in place.

6. **Iterate until the user is satisfied.**
   - Keep applying patches in response to feedback.
   - Re-render after each change.

7. **When the user is happy, point them at the Save button.**
   - The card's "Save changes" button calls \`PUT /api/agent_builder/skills/:id\` with the updated payload. You do **not** need to call any HTTP endpoint yourself.

## Examples

### Example 1: editing a known skill id

User: "Can you add a section about rate limiting to the api-security skill?"

Steps:
1. Call \`load_skill_for_editing\` with \`skill_id: "api-security"\`.
2. Emit \`<render_attachment id="att-xyz" />\`.
3. Call \`patch_skill\` to insert the rate limiting section before \`## Examples\`.
4. Re-emit \`<render_attachment id="att-xyz" />\`.
5. Ask the user to review and click Save changes when ready.

### Example 2: removing a tool

User: "Remove the execute_esql tool from my logs-debug skill."

Steps:
1. Call \`load_skill_for_editing\` with \`skill_id: "logs-debug"\`.
2. Emit \`<render_attachment id="att-abc" />\`.
3. Call \`patch_skill\` with \`tool_ids\` set to the new list (minus execute_esql) and a \`content_patch\` to remove the bullet referencing that tool from \`## Available Tools\`.
4. Re-render the updated draft.
  `),
  getInlineTools: () => [createLoadSkillForEditingTool(), createPatchSkillTool()],
});
