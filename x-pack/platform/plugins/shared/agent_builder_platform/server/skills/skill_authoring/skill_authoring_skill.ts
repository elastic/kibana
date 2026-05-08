/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createProposeSkillTool } from './propose_skill';
import { createPatchSkillDraftTool } from './patch_skill_draft';

const SKILL_AUTHORING_REFERENCE_NAME = 'skill-authoring-examples';

/**
 * Built-in skill that teaches the agent how to author Agent Builder skills
 * conversationally. When the user asks for a new skill, the agent reads this
 * SKILL.md (which triggers `loadSkillToolsAfterRead` to expose
 * `propose_skill` and `patch_skill_draft`), drafts the payload, captures it
 * as a `skill_draft` attachment, and renders it inline so the user can review
 * and click "Create".
 *
 * The `content` follows the Anthropic skill-authoring guide structure:
 * front-loaded "When to use", concrete tools list, stepwise workflow, and a
 * companion reference file with full examples.
 */
export const skillAuthoringSkill = defineSkillType({
  id: 'skill-authoring',
  name: 'skill-authoring',
  basePath: 'skills/platform/agent-builder',
  experimental: true,
  description:
    'Author a new Agent Builder skill from a chat description. Use when the user asks to create, build, generate, or design a skill, capability, or expertise area for an agent.',
  content: dedent(`
## When to Use This Skill

Use this skill when:
- The user asks to "create / build / make / design / scaffold a skill" for an agent.
- The user describes a recurring task they want an agent to handle and the right answer is a reusable skill.
- The user wants to teach the agent something they expect to reuse in future conversations.

Do **not** use this skill when:
- The user only wants a one-off answer (just answer it).
- The user wants to edit an already-persisted skill — direct them to the skill editor at /manage/skills.
- The user wants to author a tool, plugin, or agent (different entity types, not yet supported in chat).

## Available Tools

After reading this SKILL.md, two inline tools become available:

- **propose_skill** — Captures a complete first-draft payload (id, name, description, content, tool_ids, optional referenced_content) as a versioned \`skill_draft\` attachment in the conversation. Returns \`attachment_id\` and \`version\`.
- **patch_skill_draft** — Refines an existing draft by attachment_id. Supports field replacement (name, description, tool_ids), search-replace patches on \`content\`, and add/remove/patch operations on referenced files. Each call bumps the attachment version when content changes.

You also have the regular tool registry available; use \`list_tools\` if you need to confirm a tool id exists before adding it to \`tool_ids\`.

## Authoring Workflow

1. **State your interpretation and proceed immediately.**
   - Do not ask clarifying questions. Make a reasonable assumption about what the skill should do and when it should be used, state it in one sentence ("It sounds like you want a skill that…"), then proceed to draft.
   - If the request is genuinely impossible to interpret, offer two concrete options rather than an open-ended question (e.g. "Did you mean X or Y? I'll go with X unless you say otherwise.")
   - Acting on a reasonable assumption is always better than blocking the user with a question.

2. **Pick an id and name.**
   - \`id\`: lowercase slug, hyphens or underscores allowed, must start and end with a letter or number, max 64 chars. Example: \`incident-triage\`.
   - \`name\`: human-readable, letters/numbers/spaces/hyphens/underscores only — **no special characters** (e.g. write \`ESQL\` not \`ES|QL\`). Must start and end with a letter or number, max 64 chars. Example: \`Incident triage\`.
   - The pair \`(basePath, name)\` must be unique within the system; if the user gives an id that already exists, suggest a variant.

3. **Write a sharp one-line description.**
   - Max 1024 chars but aim for one sentence.
   - Lead with **when** to use it, not what it does. Example: "Use when investigating production incidents that mention error rates, latency spikes, or failed deployments."
   - This is what other agents see in the catalog, so it should read like a routing hint.

4. **Draft the SKILL.md content.**
   - The content is markdown only. Do **not** include YAML front matter (\`---\`); the runtime injects \`name\` / \`description\` automatically.
   - Required structure (in order):
     1. \`## When to Use This Skill\` — bullet list of situations to use, plus a "Do not use" list.
     2. \`## Available Tools\` — bullet list referencing each tool in \`tool_ids\` by id, with a one-liner of how it fits.
     3. \`## Workflow\` (or domain-specific equivalent) — numbered steps the agent should follow.
     4. \`## Examples\` — at least one concrete example: what the user said, what tool calls were made, what the answer looked like.
   - Keep it under ~400 lines. If the skill needs more detail, push code samples / long examples into a referenced file.

5. **Pick the registry tools the skill needs.**
   - Maximum **5** tool ids per skill. Keep this list focused on tools the skill *requires*; common platform tools like \`list_indices\` rarely need to be listed.
   - Each id must already exist in the tool registry. If unsure, call \`list_tools\` first.
   - If the user mentions a tool that doesn't exist, tell them so and offer to proceed without it.

6. **(Optional) Add referenced files for examples or reference snippets.**
   - Up to 100 files. Each file lives at \`[basePath]/[skill-name]/[relativePath]/[name].md\` in the agent filestore.
   - \`relativePath\` must start with \`./\`, no \`../\`. Use \`./\` for the skill root, \`./examples\` for a single subfolder.
   - Use referenced files for: long code examples, ES|QL templates, prompt templates, table-of-contents that the model should look up rather than memorize.
   - The reserved name \`skill\` at the root path \`./\` is forbidden (it collides with \`SKILL.md\`).

7. **Call \`propose_skill\`.**
   - Pass the full payload in one shot.
   - On success the tool returns \`attachment_id\` and \`version\`.

8. **Render the draft inline.**
   - Immediately emit \`<render_attachment id="ATTACHMENT_ID" />\` (replacing \`ATTACHMENT_ID\` with the value from the tool result) so the user sees the draft card with **Create** / **Open in editor** buttons. Do not surround it with quotes or a code fence.
   - Keep your prose response short — just summarize what you proposed and prompt the user to review the card.

9. **Iterate on feedback via \`patch_skill_draft\`.**
   - When the user asks for changes ("make it shorter", "add the X tool", "rename to Y"), call \`patch_skill_draft\` with the existing \`attachment_id\` and only the fields that need to change.
   - Prefer search-replace patches over full rewrites; it's cheaper and easier for the user to follow.
   - After each patch, re-render the attachment so the card refreshes in place.

10. **When the user is happy, point them at the Create button.**
    - The card itself wires "Create" to \`POST /api/agent_builder/skills\`. You do **not** need to call any HTTP endpoint yourself — the user clicks the button.

## Examples

See the referenced file \`${SKILL_AUTHORING_REFERENCE_NAME}.md\` for a complete worked example (initial draft + a follow-up patch).
  `),
  referencedContent: [
    {
      relativePath: './examples',
      name: SKILL_AUTHORING_REFERENCE_NAME,
      content: dedent(`
# Skill Authoring Examples

## Example 1: full first-draft payload

User said: "Build me a skill that helps investigate slow ES|QL queries on logs indices."

\`propose_skill\` payload:

\`\`\`json
{
  "id": "esql-query-debug",
  "name": "ES|QL query debug",
  "description": "Use when a user reports that an ES|QL query against a logs-* index is slow, returning unexpected rows, or erroring. Walks through the standard debug checklist using execute_esql and the index mapping tools.",
  "content": "## When to Use This Skill\\n\\nUse this skill when:\\n- A user shares an ES|QL query that runs slowly on a logs-* index.\\n- A user reports that an ES|QL query returns wrong row counts or unexpected nulls.\\n- A user wants help interpreting an ES|QL error message against a known index.\\n\\nDo not use this skill when:\\n- The user wants a *new* visualization (use visualization-creation).\\n- The user wants to schedule a query (use workflows).\\n\\n## Available Tools\\n\\n- **platform.core.execute_esql**: Run a candidate query and inspect the result shape and timings.\\n- **platform.core.get_index_mapping**: Confirm field names and types when the model isn't sure they exist.\\n- **platform.core.generate_esql**: Rewrite a natural-language description into ES|QL when the user shares prose, not query.\\n\\n## Workflow\\n\\n1. Read the user's query (or generate one with platform.core.generate_esql).\\n2. Confirm the target index exists and grab its mapping with platform.core.get_index_mapping. Flag any missing fields immediately.\\n3. Run a LIMIT 100 version of the query with platform.core.execute_esql to see the result shape and runtime.\\n4. If slow, suggest specific changes: add a time filter, drop large fields with KEEP, replace MV functions with simpler equivalents.\\n5. Re-run after each suggested change and report the runtime delta.\\n\\n## Examples\\n\\n- 'Why is this query slow?' on logs-app-*: confirmed mapping had keyword 'host.name' (not text), suggested adding @timestamp >= NOW() - 24h, runtime dropped from 8s to 600ms.\\n",
  "tool_ids": [
    "platform.core.execute_esql",
    "platform.core.get_index_mapping",
    "platform.core.generate_esql"
  ]
}
\`\`\`

Tool result (truncated):

\`\`\`json
{
  "attachment_id": "att-abc123",
  "version": 1,
  "skill_id": "esql-query-debug",
  "referenced_files": 0,
  "tool_ids": ["platform.core.execute_esql", "platform.core.get_index_mapping", "platform.core.generate_esql"]
}
\`\`\`

Assistant reply (one short paragraph + render tag):

\`\`\`xml
I drafted a skill called esql-query-debug with three associated tools. Review the card below — when you're happy, click Create.

<render_attachment id="att-abc123" />
\`\`\`

## Example 2: follow-up patch

User said: "Drop the generate_esql tool and add a section about histogram() pitfalls."

\`patch_skill_draft\` payload:

\`\`\`json
{
  "attachment_id": "att-abc123",
  "tool_ids": [
    "platform.core.execute_esql",
    "platform.core.get_index_mapping"
  ],
  "content_patches": [
    {
      "find": "## Examples\\n",
      "replace": "## Histogram Pitfalls\\n\\n- BUCKET() with millisecond span on @timestamp can blow up cardinality; prefer per-hour or per-minute spans for production logs.\\n- Combine BUCKET() with FROM ... | WHERE @timestamp >= ... to avoid scanning the full retention window.\\n\\n## Examples\\n"
    }
  ]
}
\`\`\`

Tool result:

\`\`\`json
{
  "attachment_id": "att-abc123",
  "version": 2,
  "skill_id": "esql-query-debug",
  "referenced_files": 0,
  "tool_ids": ["platform.core.execute_esql", "platform.core.get_index_mapping"]
}
\`\`\`

Assistant reply:

\`\`\`xml
Dropped generate_esql and added a Histogram Pitfalls section. Updated card:

<render_attachment id="att-abc123" />
\`\`\`

## Example 3: when to add a referenced file

If the skill includes long, copy-pasteable templates (a 60-line ES|QL query template, a JSON config snippet, a prompt fragment), put them in \`referenced_content\` instead of inline:

\`\`\`json
{
  "referenced_content": [
    {
      "name": "slow-query-checklist",
      "relativePath": "./examples",
      "content": "# Slow Query Checklist\\n\\n1. ..."
    }
  ]
}
\`\`\`

The model can then use the filestore tools to read \`./examples/slow-query-checklist.md\` lazily, keeping SKILL.md compact.
      `),
    },
  ],
  getInlineTools: () => [createProposeSkillTool(), createPatchSkillDraftTool()],
});
