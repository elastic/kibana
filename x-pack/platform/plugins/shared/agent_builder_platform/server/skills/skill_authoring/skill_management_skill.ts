/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createListSkillsTool } from './list_skills';
import { createLoadSkillForEditingTool } from './load_skill_for_editing';
import { createPatchSkillTool } from './patch_skill';

/**
 * Built-in skill that lets the user view or modify an existing Agent Builder
 * skill conversationally. The agent calls `load_skill_for_editing` to fetch
 * the current content and render it inline. If changes are requested,
 * `patch_skill` refines the draft and clicking "Save changes" on the card
 * calls `PUT /api/agent_builder/skills/:id` to persist them.
 */
export const skillManagementSkill = defineSkillType({
  id: 'skill-management',
  name: 'skill-management',
  basePath: 'skills/platform/agent-builder',
  experimental: true,
  description:
    'View or edit an existing Agent Builder skill. Use when the user asks to see, show, display, view, edit, update, modify, change, improve, or fix an existing skill.',
  content: dedent(`
## When to Use This Skill

Use this skill when:
- The user wants to view or display an existing skill.
- The user asks to "edit / update / modify / change / improve / fix" an existing skill.
- The user references a specific skill by name or id, whether or not they want changes.
- The user wants to add or remove tools from a skill they already own.

Do **not** use this skill when:
- The user wants to create a brand-new skill — use the skill-authoring skill instead.
- The user is asking about a built-in (readonly) skill — those cannot be loaded via chat.

## Available Tools

After reading this SKILL.md, three inline tools become available:

- **list_skills** — Lists all user-created skills (id, name, description). Call this first to confirm the correct skill id before loading.
- **load_skill_for_editing** — Fetches an existing user-created skill by id and renders it as an inline attachment. If no changes are needed the card shows an "Edit in Management" link. If \`patch_skill\` is called afterwards, a "Save changes" button appears automatically.
- **patch_skill** — Applies targeted edits to the draft attachment (rename, edit description, swap tool_ids, search-replace on \`content\` or referenced files, add/remove referenced files).

## Workflow

1. **Identify the skill.**
   - Call \`list_skills\` to confirm the correct id.
   - Do **not** guess an id — an incorrect id returns an error.

2. **Call \`load_skill_for_editing\`** with the confirmed skill id.

3. **Render the attachment only when appropriate.**
   - If the user just wants to view the skill, emit \`<render_attachment id="ATTACHMENT_ID" />\` so they see the current content.
   - If the user already asked for changes that you will apply via \`patch_skill\` in this same round, **skip this render** — emit \`<render_attachment>\` only after the final patch. Showing the pre-patch state is redundant and clutters the response.

4. **If the user wants changes, apply them via \`patch_skill\`.**
   - Use targeted search-replace patches rather than rewriting fields wholesale.
   - Prefer \`content_patches\` for surgical edits to the markdown body.
   - Use \`tool_ids\` replacement only when the full list is changing.
   - After the final patch, emit \`<render_attachment id="ATTACHMENT_ID" />\` once so the user sees the updated draft.

5. **When the user is happy, point them at the Save button.**
   - The card's "Save changes" button calls \`PUT /api/agent_builder/skills/:id\`. You do **not** need to call any HTTP endpoint yourself.

## Examples

### Example 1: view only

User: "Show me the api-security skill."

Steps:
1. Call \`list_skills\` to confirm \`skill_id: "api-security"\`.
2. Call \`load_skill_for_editing\` with that id.
3. Emit \`<render_attachment id="att-xyz" />\`.

### Example 2: edit — add content

User: "Add a section about rate limiting to the api-security skill."

Steps:
1. Call \`list_skills\` to confirm \`skill_id: "api-security"\`.
2. Call \`load_skill_for_editing\`.
3. Call \`patch_skill\` to insert the rate limiting section.
4. Emit \`<render_attachment id="att-xyz" />\` once so the user sees the updated draft.
5. Ask the user to review and click Save changes when ready.

### Example 3: edit — remove a tool

User: "Remove the execute_esql tool from my logs-debug skill."

Steps:
1. Call \`list_skills\` to confirm \`skill_id: "logs-debug"\`.
2. Call \`load_skill_for_editing\`.
3. Call \`patch_skill\` with the updated \`tool_ids\` and a \`content_patch\` removing the tool reference.
4. Emit \`<render_attachment id="att-abc" />\` once so the user sees the updated draft.
  `),
  getInlineTools: () => [
    createListSkillsTool(),
    createLoadSkillForEditingTool(),
    createPatchSkillTool(),
  ],
});
