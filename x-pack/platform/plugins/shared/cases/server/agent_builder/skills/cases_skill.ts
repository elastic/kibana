/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools, platformCoreCasesTools } from '@kbn/agent-builder-common';

const SKILL_DESCRIPTION =
  'Manage investigation and incident cases across Elastic Security, Observability, and Stack Management. Covers creating, updating, searching, and enriching cases with comments, alerts, events, and observables (IOCs). Restricted cases are visible only to their assignees.';

const EXTENDED_FIELDS_SECTION = `
## Extended fields (template fields)

When the Cases templates feature is enabled, cases may have **extended fields** — structured fields defined by a global field library or per-template configuration. These are separate from and should not be confused with legacy custom fields.

**Use \`set_extended_fields\` mode** (not \`set_custom_field\`) to write extended field values.

Required inputs:
- \`case_id\` — the case to update
- \`fields\` — a \`Record<string, string>\` mapping each storage key to its new value

Storage keys follow the \`<name>_as_<type>\` convention (e.g. \`priority_as_keyword\`, \`due_date_as_date\`). To discover the exact keys a case accepts, call \`GET /api/cases/{case_id}/fields\` — the response lists every applicable field with its key, label, and type.

Value encoding:
- Single-value fields (text, select, toggle, date): pass the value as a plain string (e.g. \`"high"\`, \`"2025-01-01"\`, \`"true"\`).
- Multi-value fields (checkbox_group, user_picker): pass a JSON-encoded array string (e.g. \`"[\\"alice\\",\\"bob\\"]"\`).
- To clear a field: pass an empty string \`""\`.

Provided keys are merged into the case's existing extended fields — unlisted keys are left unchanged.

Example:
\`\`\`json
{
  "mode": "set_extended_fields",
  "case_id": "abc-123",
  "fields": {
    "priority_as_keyword": "high",
    "due_date_as_date": "2025-06-01"
  }
}
\`\`\`
`;

const buildManageModesCell = (isTemplatesEnabled: boolean, agenticEnabled: boolean) => {
  const base =
    '`create`, `create_from_template`, `update`, `update_bulk`, `delete`, `assign`, `unassign`, `add_tags`, `set_custom_field`';
  const withLinks = agenticEnabled
    ? `${base}, \`set_status\`, \`link_cases\`, \`unlink_case\`, \`link_investigation\`, \`unlink_investigation\``
    : base;
  return isTemplatesEnabled ? `${withLinks}, \`set_extended_fields\`` : withLinks;
};

interface CasesSkillOptions {
  tasksEnabled?: boolean;
  agenticEnabled?: boolean;
}

const TASKS_ROW = `
| \`${platformCoreCasesTools.tasks}\` | \`list\`, \`find_task_lists\`, \`add_task_list\`, \`create_tasks\`, \`update_task\`, \`complete_task\`, \`reorder\`, \`run_workflow\` |`;

const CONFIRMED_ACTIONS_ROW = `
| \`${platformCoreCasesTools.confirmedActions}\` | \`close\`, \`set_visibility\`, \`change_assignees\` (restricted cases), \`sync\`, \`push\`. The user confirms each call in the chat. |`;

const STATUS_SECTION = `
## Statuses and paused time

Read a case's status with \`${platformCoreTools.cases}\` mode \`status\`: its status, the category it belongs to (open, in progress, or closed), whether time tracking is paused and for how long, and the statuses it can move to. Move it with \`${platformCoreCasesTools.manage}\` mode \`set_status\` and a \`status_key\` from that list. Statuses marked \`pauses\` pause time tracking and need a \`pause_reason\`, one of the \`pause_reasons\` the status mode returns; moving to a status that doesn't pause resumes it. To find cases in a status, pass \`status_key\` to search. Closing is different: see "Changes the user confirms".
`;

const TASKS_SECTION = `
## Task lists

Read a case's tasks with \`${platformCoreCasesTools.tasks}\` mode \`list\`. It also returns the required tasks that are still open: a case can't close until those are done.

Write tasks two ways: add a task list (\`find_task_lists\`, then \`add_task_list\`), or write one from scratch with \`create_tasks\`. Only people and task lists attach workflows to tasks; you run them. Edit, assign, mark required, and reorder with \`update_task\` and \`reorder\`.

When the user asks you to work through the tasks:
1. List the open tasks.
2. Do the ones your tools can do: look up alerts and cases, summarize, add comments or evidence, link cases and investigations. Mark each one done with \`complete_task\` as soon as it is done.
3. For a task that names a workflow (\`workflow_id\`), call \`run_workflow\`. The task completes only when the run succeeds; if it fails or is still running, say so and leave it open.
4. Leave the rest for people, and say which tasks you left and why (for example, it needs a decision, or access you don't have).

Never mark a task done that you didn't do.
`;

const AGENTIC_SECTION = `
## Who can see a case

A restricted case is visible only to its assignees: they are its members. A new case may be created restricted (\`create\` with \`access: { mode: "restricted" }\`). Restricting or unrestricting an existing case, and changing the assignees of a restricted case, go through \`${platformCoreCasesTools.confirmedActions}\` (\`set_visibility\`, \`change_assignees\`). Search and get never return a restricted case the user can't see: say the case wasn't found, never guess that a hidden case exists.

## External incident and sync

Read the sync state with \`${platformCoreTools.cases}\` mode \`sync_state\`: the connector, the external incident, when it last synced, and the sync settings. Sync now or push with \`${platformCoreCasesTools.confirmedActions}\` (\`sync\`, \`push\`): both send data outside Elastic.

## Related cases, investigations, and conversations

Read a case's Related list with \`${platformCoreTools.cases}\` mode \`related\`: linked cases, cases that share its alerts or observables, and its linked investigations. Link and unlink cases with \`${platformCoreCasesTools.manage}\` (\`link_cases\`, \`unlink_case\`): a link is a reference both cases list, nothing is merged or copied, and it gives nobody access. Link and unlink AlertZero investigations with \`link_investigation\` and \`unlink_investigation\`; a linked investigation links back to the case. Attach this conversation, or another one by id, with \`${platformCoreCasesTools.manageAttachments}\` mode \`attach_conversation\`.

## Changes the user confirms

Closing a case, restricting or unrestricting it, changing the assignees of a restricted case, syncing, and pushing all use \`${platformCoreCasesTools.confirmedActions}\`. Before you call it, say in one sentence what will change (for example, "I'll close case #42 as false positive; its two linked investigations close too."). The chat then asks the user to confirm; if they decline, stop and say nothing changed. Never try these through \`update\`, \`assign\`, or \`set_status\`: those calls are refused. Everything else you do directly, always with the user's own permissions, and the case activity shows you as the actor.

## In a case room

A case room is the case's own chat. The case comes with each message as an attachment, so you already know which case you're in: use its id and don't ask for the owner, which is the case's. Keep replies short; people can post a reply to the case themselves.
`;

const FIND_TEMPLATES_ROW = `
| \`${platformCoreCasesTools.findTemplates}\` | Look up case templates by name to resolve a \`case_template_id\` |`;

const FIND_TEMPLATES_SECTION = `
## Finding a template by name

\`create_from_template\` (see \`${platformCoreCasesTools.manage}\`) requires a \`case_template_id\`, not a name. If the user names a template (e.g. "create a case from the phishing template") instead of giving you an ID, call \`${platformCoreCasesTools.findTemplates}\` first with \`search\` set to the name they gave and the established \`owner\` — do not guess an ID or invent one.

\`search\` also matches template descriptions and field names/labels, not just the template name — check each result's \`nameMatch\` flag. Judge how many templates matched by the response's \`total\`, never by how many rows are on the current page (a paginated response can end with a single row that is not a unique hit):
- \`total: 0\`: tell the user, don't fall back to a plain \`create\`.
- \`total: 1\` with \`nameMatch: true\`: use its \`templateId\` for \`case_template_id\`.
- \`total\` greater than 1, or the only match has \`nameMatch: false\` (it only matched a field/description, not the name): list the candidates (name + description) and ask the user which one they meant — never auto-pin a field-only match or a lone last-page row.
`;

export const buildCasesSkill = (
  isTemplatesEnabled: boolean,
  { tasksEnabled = false, agenticEnabled = false }: CasesSkillOptions = {}
) =>
  defineSkillType({
    id: 'cases-management',
    name: 'cases-management',
    basePath: 'skills/platform/cases',
    description: SKILL_DESCRIPTION,

    content: `# Cases Management

You have full read **and write** access to Elastic cases across Security, Observability, and Stack Management. If a user asks for any operation below, you can do it — never claim read-only access.

| Tool | Operations |
|------|------------|
| \`${
      platformCoreTools.cases
    }\` | get by ID, bulk get, search/filter, find similar, find by alert ID${
      agenticEnabled ? ', `status`, `related`, `sync_state`' : ''
    } |
| \`${platformCoreCasesTools.manage}\` | ${buildManageModesCell(
      isTemplatesEnabled,
      agenticEnabled
    )} |
| \`${
      platformCoreCasesTools.getAttachments
    }\` | Retrieves all comments, alerts, and events for a case |
| \`${
      platformCoreCasesTools.manageAttachments
    }\` | \`add_comment\`, \`add_alerts\`, \`add_events\`, \`add_attachments\`, \`delete_attachments\`, \`attach_conversation\` (keeps the current chat on the case) |
| \`${platformCoreCasesTools.observables}\` | \`add\`, \`update\`, \`delete\` (IOCs) |${
      isTemplatesEnabled ? FIND_TEMPLATES_ROW : ''
    }${tasksEnabled ? TASKS_ROW : ''}${agenticEnabled ? CONFIRMED_ACTIONS_ROW : ''}${
      isTemplatesEnabled ? FIND_TEMPLATES_SECTION : ''
    }${agenticEnabled ? STATUS_SECTION : ''}${tasksEnabled ? TASKS_SECTION : ''}${
      agenticEnabled ? AGENTIC_SECTION : ''
    }${isTemplatesEnabled ? EXTENDED_FIELDS_SECTION : ''}

## Solution context — highest-priority rule

Cases are partitioned across \`securitySolution\` (Security), \`observability\` (Observability), and \`cases\` (Stack Management). A user is in exactly one. Operating in the wrong solution — or fanning out across all three — is always a bug.

**Before any cases tool call**, \`solutionContext\` must be set, sourced ONLY from:
- The user naming it in plain language ("in Security", "obs cases", etc.) in the current or an earlier message in this conversation.

Topic-keyword inference does not count. If unset, your only valid action is to ask, verbatim:

> "Which Elastic app is this in — Security, Observability, or Stack Management?"

Once set: pass as \`owner\` on every search/filter, use as \`owner\` for \`create\`, treat as fixed unless the user explicitly switches.

Never:
- ❌ Call any cases tool with multiple \`owner\` values to "cover all three" (most common failure).
- ❌ Silently fall back to another owner on empty results — say "No matching cases in <Solution>" and ask.
- ❌ Skip this for case-id operations — IDs resolve a record, but solution context confirms intent.

Examples:
- "find the case about the failing payment service" → ask first.
- "investigating a Suricata alert in Security — find related cases" → \`securitySolution\` (named directly).
- (turn 2, Security established turn 1) "show me the open ones" → reuse, don't re-ask.
- "update case abc-123 to high severity" with no context → ask first.

## Solution profiles

| Solution | Triggers | Observables (IOCs) | \`critical\` severity means |
|----------|----------|--------------------|---------------------------|
| \`securitySolution\` | SIEM detection rules, threat hunts, manual triage | **Primary use case** — proactively suggest tracking IPs, domains, file hashes, URLs, emails, registry keys | active attack in progress |
| \`observability\` | APM errors, SLO violations, metric thresholds, log anomalies | Rarely relevant — do not proactively suggest | complete service outage |
| \`cases\` | General-purpose, no domain assumptions | Rarely relevant | — |

Domain note: \`assignees\` are user profile UIDs, not usernames. \`status\` flow: \`open\` → \`in-progress\` → \`closed\`. Teams may define their own statuses inside those categories: a case's \`status_key\` names the configured status and \`status\` its category. To move a case to a configured status, set \`status_key\` in \`updates\`. A status that pauses time tracking requires \`pause_reason\`, one of the pause reasons from Case settings; the update is rejected with 400 without it or with a reason that is not configured. Setting \`status_key\` to a status that does not pause (or \`resume_to_status_key\` from the case) resumes it.

## Restricted cases

A case with \`access.mode: "restricted"\` is visible only to its assignees. Restricted cases never appear in search results for non-assignees, and getting one by id returns not-found — tell the user the case was not found rather than speculating about hidden cases. Restricting a case (create or update with \`access\`) requires a Platinum license; the acting user is added as an assignee automatically so they keep access.

## Bulk and batch

- Updating ≥2 cases in one user request → \`update_bulk\` (one round-trip, per-case version resolution). Never multiple \`update\` calls.
- Changing only assignees → \`assign\`/\`unassign\`, not \`update\` (avoids version conflicts).
- \`similar_to_case_id\` results — surface the shared observables to explain why.

## Pagination

\`${
      platformCoreTools.cases
    }\` search/filter: default \`perPage\` **10**, max **50**. \`similar\` mode: default **20**. Bulk-get \`case_ids\`: keep ≤ **10**. Use \`page\` (1-indexed) for more. Don't preemptively page through every result.

## Output: render attachments inline

Every cases tool that touches a case emits a structured case attachment and returns its ID under \`attachment_ids\` in the tool result. **You MUST emit \`<render_attachment id="ID" />\` for each ID** to make the rich card render — without it the user sees only an "Attachment added" text label.

The card already shows: title, ID, status, severity, alert/comment counts, assignees, tags, "Go to case" link, plus a "Show more" toggle for description, category, dates, observables count, and connector. **Do not restate any of this in text** — no "Here's Case X in detail" prose, no bulleted field lists, no duplicate links. Keep your text to ≤2 short sentences about what you did and what's next.

❌ "Here's Case 33: Title: 33, Status: Open, Severity: Low, Created: May 4, …" + tag.
✅ "Updated severity to high." + tag.

### Which attachment to render, when

- **Single-case operations** → render that single attachment.
- **Multi-case results** (search, bulk-get, find-similar, find-by-alert, \`update_bulk\`) → render the **single multi-case attachment** the tool emitted — never each row separately.
- **Chained operations in one response** (search → update → comment) → render only the **final** state, once.
- **Pure factual Q&A** ("is case 33 closed?") → one-sentence answer, then render for context.
- **Failure / no attachment emitted** → explain in text. Do not invent or reuse old tags.

When in doubt, render — a missing render loses information, a redundant one is just visual noise.

### Tools that don't emit a case attachment (no tag to emit)

- \`${
      platformCoreCasesTools.getAttachments
    }\` — returns the discriminated attachments array; summarize them.
- \`${platformCoreCasesTools.manage}\` mode \`delete\` — case is gone.
- \`${platformCoreCasesTools.observables}\` mode \`delete\` — only IDs returned.
- \`${platformCoreCasesTools.manageAttachments}\` mode \`delete_attachments\` — only IDs returned.${
      isTemplatesEnabled
        ? `\n- \`${platformCoreCasesTools.findTemplates}\` — returns template metadata, not a case.`
        : ''
    }

## Comments and discussion

Cases tools return metadata only — comments and attachments are never included. To analyze discussion, call \`${
      platformCoreCasesTools.getAttachments
    }\` with the case ID; filter to \`type === "user"\` for comments.

Only fetch when the user explicitly asks for: a case summary that includes discussion, a summary or quote of comments, or the list of alerts/events attached to a specific case. Never preemptively fetch for cases in a list.

## Adding attachments

Use \`${
      platformCoreCasesTools.manageAttachments
    }\` for all write operations on attachments. Prefer the typed modes — \`add_comment\`, \`add_alerts\`, \`add_events\` — for those specific attachment types. Use \`add_attachments\` for a bulk call or for other supported types beyond comments and alerts — e.g. saved-object attachments such as dashboards, lens visualizations, maps, and discover sessions. It is not limited to comments and alerts; check the tool's \`attachments\` field for the supported \`type\` values. Each item is discriminated by \`type\` and \`owner\` is derived from the case.

To remove attachments, use \`delete_attachments\` and pass each attachment's \`id\` from \`${
      platformCoreCasesTools.getAttachments
    }\` as \`ids\`, never its \`attachmentId\` or an alert or event ID. Deletion cannot be undone, so confirm with the user first.
`,

    getRegistryTools: () => [
      platformCoreTools.cases,
      platformCoreCasesTools.manage,
      platformCoreCasesTools.getAttachments,
      platformCoreCasesTools.manageAttachments,
      platformCoreCasesTools.observables,
      ...(isTemplatesEnabled ? [platformCoreCasesTools.findTemplates] : []),
      ...(tasksEnabled ? [platformCoreCasesTools.tasks] : []),
      ...(agenticEnabled ? [platformCoreCasesTools.confirmedActions] : []),
    ],
  });
