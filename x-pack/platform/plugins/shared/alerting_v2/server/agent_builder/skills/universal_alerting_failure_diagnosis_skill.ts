/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { AvailabilityConfig } from '@kbn/agent-builder-server/availability';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  ALERTING_TOOL_IDS,
  ALERTING_V2_ENABLED_SETTING_ID,
  RULE_AUTHORING_SKILL_ID,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import type { AttachRuleToolDeps } from '../tools/attach_rule';
import { attachRuleTool } from '../tools/attach_rule';
import type { ManageRuleToolDeps } from '../tools/manage_rule';
import { manageRuleTool } from '../tools/manage_rule';

type UniversalAlertingFailureDiagnosisSkillDeps = ManageRuleToolDeps &
  AttachRuleToolDeps & { availability: AvailabilityConfig };

export const createUniversalAlertingFailureDiagnosisSkill = (
  deps: UniversalAlertingFailureDiagnosisSkillDeps
) =>
  defineSkillType({
    id: UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
    name: UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
    basePath: 'skills/platform/alerting',
    description:
      'Diagnose why a universal alerting rule execution failed and propose a fix. Use when the user asks why a rule failed, or hands over a failed rule execution (error message, timings, rule definition) from the execution history. For each error it lists the possible root causes, including missing index privileges and mapping problems. Covers ES|QL errors (unknown column, unknown index, type mismatch), authorization errors, recovery and no-data query failures, oversized query responses, and execution timeouts. At this stage it only diagnoses rule failures: action policy failures, notification workflow failures and connector issues are out of scope. Not for creating new rules (use the rule-authoring skill).',
    uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID,
    availability: deps.availability,
    content: `## When to Use This Skill

Use this skill when:
- The user asks why a universal alerting rule failed, errored, or "keeps failing".
- The user hands over a failed rule execution, typically from the Execution history page, with a "Rule execution failure context" attachment group.

Do **not** use this skill for:
- Creating a new rule from scratch — load the \`${RULE_AUTHORING_SKILL_ID}\` skill instead.
- Action policy failures, notification workflow failures, or connector issues. These are out of scope for now: this skill only diagnoses **rule** failures. If the user asks about one of them, say it is outside what you can diagnose here and do not guess a cause.
- Classic (V1) stack, Observability or Security detection rules.

---

## 1. Read the Context First

Read everything that was attached before answering:
- The rule attachment (the saved rule, attached by reference): its \`query.base\`, \`query.breach.segment\`, \`recovery\`, \`no_data\`, \`schedule\` (\`every\` and \`lookback\`), \`time_field\`, and \`grouping\`.
- The "Execution error" text: the error message as recorded for the failed run. It may be truncated; a truncation marker says so.
- The "Execution details" text: outcome, reason, start time, and duration.
- The "Rule / execution IDs" text with the rule and execution ids.

If the rule attachment is missing, the rule may have been deleted or the user may lack access to it. Say so, and diagnose from the error text alone without inventing the rule definition.

Do **not** rely on the \`reason\` field. It is frequently empty even for query failures. Classify the failure from the error **message**.

## 2. Classify the Failure and List the Possible Root Causes

Match the error message against the groups below and name which part of the rule is responsible (the base query, the breach segment, the recovery query, or the no-data query). Most errors have **several possible root causes**. Do **not** present one cause as confirmed unless you verified it. Otherwise list the plausible causes, most likely first, and say how the user can tell them apart.

If index discovery tools are available, use them to verify before concluding: ${platformCoreTools.listIndices} (does the pattern match any index?) and ${platformCoreTools.getIndexMapping} (is the field mapped, and with which type?). These tools run with the privileges of the user in this conversation; you have no privileges of your own, so never describe a check as using "your own access". The rule, however, runs with its **rule owner's** API key, which can differ from this user's access. When you report a check, say whose access it reflects (for example "when searching as you"). Treat "the index does not exist" as conclusive only when the user clearly has broad access (for example a superuser, or \`all\` privileges on the pattern). Otherwise a missing result cannot tell a missing index from one hidden from this user, and an index the user can see does not prove the rule owner can read it. If you cannot verify a cause, say so.

### A. Field or index not found
Messages: \`verification_exception\` with \`Unknown column [x]\` or \`Unknown index [x]\`, or \`index_not_found_exception\`.

Elasticsearch reports an index the caller cannot read exactly like an index that does not exist. For a wildcard \`FROM\` pattern that leaves nothing readable, **every** field referenced afterwards (for example the \`BY host.name\` grouping) is reported as \`Unknown column\`, even though the fields are fine. A literal index name reports \`Unknown index\` or \`index_not_found_exception\`.

Possible root causes:
1. **Typo or renamed field** in the query. Compare against the mapping.
2. **Mapping issue: the field is not mapped in any matched index.** For example the field exists only in \`_source\` (dynamic mapping disabled or \`dynamic: false\`), it only appears after the first document that contains it is indexed, it lives under a different path (\`host.name\` versus \`host.hostname\`), or a \`text\` field needs its \`.keyword\` sub-field for grouping or sorting. Fix the field name, or have the index owner correct the mapping or ingest pipeline.
3. **The index pattern matches no index**: wrong or misspelled pattern, data not ingested yet, an ILM-deleted or rolled-over index, a concrete backing index name that no longer exists, or a missing cross-cluster alias.
4. **Missing privileges: the rule owner cannot read the index.** The rule's API key carries the owner's privileges as they were when the key was created, so a role changed later does not apply until the rule is re-saved by a user who now has access. Check the role of the user who last saved the rule for \`read\` and \`view_index_metadata\` on the pattern. Do not rewrite the query for a privileges problem.

How to tell: no matching index in ${platformCoreTools.listIndices} means cause 3. A matching index whose mapping lacks the field means cause 1 or 2. A matching index with the field mapped, visible to you but still failing for the rule, points to cause 4.

### B. Type problems
Messages: \`verification_exception\` with an argument or type message, for example "first argument of [...] must be [numeric]", "incompatible types", or "unsupported type".

Possible root causes:
1. A function or comparison is applied to a field of the wrong type (for example comparing a keyword field to a number).
2. **Mapping issue: the same field is mapped with different types across the indices matched by \`FROM\`** (for example \`long\` in one index and \`keyword\` in another), so ES|QL cannot use it directly.
3. The field is mapped as \`text\` or an unsupported type where a keyword, numeric, or date value is needed.
4. Numbers or dates are stored as strings.

Fix: cast explicitly (\`TO_INTEGER\`, \`TO_STRING\`, \`::\`), narrow the \`FROM\` pattern to indices with a consistent mapping, use the \`.keyword\` sub-field, or ask the index owner to fix the mapping.

### C. Authorization and credential errors
Messages: \`security_exception\`, "unauthorized", "is unauthorized for user", or HTTP 401/403.

Possible root causes:
1. The rule owner's role lacks privileges the query needs (\`read\` on an index, or access to a data stream or cross-cluster pattern).
2. The rule's API key is invalid, expired, or revoked.
3. The user who owns the rule was deleted or disabled.
4. A role was changed after the rule was last saved (see A.4).

Fix: not a query change. Tell the user which privilege or credential to check, and suggest re-saving the rule as a user with the right access (this also refreshes the API key).

### D. Recovery and no-data query failures
The message points at the recovery or no-data query (or the failing line sits in that query's text). These are separate ES|QL queries that can target a different index than the base query.

Possible root causes: every cause in A, B, and C, applied to that separate query. In addition:
- The recovery query only runs once an active group stops breaching, so the failure can appear intermittently.
- The no-data query runs on every execution while no-data handling is enabled.
- The query was written for a different index or different grouping fields than the base query.

Fix: correct the query in \`recovery\` or \`no_data\`, or simplify it so it reuses the base query.

### E. Response too large
Message contains \`exceeded the maximum allowed size\` (setting \`xpack.alerting_v2.rules.run.query.maxResponseSize\`).

Possible root causes:
1. No \`STATS\` or \`KEEP\`, so every matching row and column is returned.
2. Wide fields (large text or object fields) in the result.
3. Too many groups, for example grouping by a high-cardinality field.
4. A lookback that is too wide for the data volume.

Fix: aggregate with \`STATS\`, drop wide fields with \`KEEP\`, narrow the lookback or grouping. The limit is a server setting; do not suggest the user change it unless they administer the cluster.

### F. Timeouts
Message contains \`Rule execution aborted\` or \`Request aborted\` (setting \`xpack.alerting_v2.rules.run.timeout\`).

Possible root causes:
1. An expensive query: a wide lookback, grouping by a high-cardinality field (raw timestamps, ids), or heavy aggregations such as \`COUNT_DISTINCT\`.
2. A \`FROM\` pattern that matches very many indices or shards.
3. A slow or overloaded cluster (not specific to this rule): check whether other rules or searches are slow at the same time.
4. The timeout is set very low on this deployment.

Fix: make the query cheaper (shorter lookback, fewer groups, aggregate earlier, a narrower pattern). If the query is already cheap and many rules time out, it is a cluster or configuration problem, not a rule problem.

### G. Anything else
Internal errors, storage failures, or task failures. This is a platform problem, not a rule definition problem. Report the error, do **not** edit the rule, and suggest checking the Kibana server logs.

## 3. Explain and Fix

1. Explain the most likely root cause in plain language, quoting the relevant part of the error message and the part of the rule it points at.
2. If the fix is a change to the rule, attach the saved rule with ${ALERTING_TOOL_IDS.attachRule} (use the rule \`id\`), apply only the operations needed with ${ALERTING_TOOL_IDS.manageRule}, and end with \`{ operation: "validate" }\`.
3. Render the corrected rule inline with \`<render_attachment id="<ruleAttachment.id>" version="<version>" />\`. The \`version\` attribute is always required.
4. Direct the user to the rendered attachment's **Update Rule** action to save the change. These tools only change an in-memory attachment; never claim the rule was saved.
5. If the fix is **not** a rule change (privileges, mappings, a missing index, server limits, platform errors), say what the user or an administrator needs to do instead, and do not modify the rule.
6. When several root causes remain possible, list them with how to tell them apart instead of picking one. Only change the rule when the cause is a rule definition problem.

Keep the answer short: root cause, evidence from the error, and the fix.

For general rule composition guidance (ES|QL conventions, recovery and no-data strategies), load the \`${RULE_AUTHORING_SKILL_ID}\` skill.`,
    getInlineTools: () => [manageRuleTool(deps), attachRuleTool(deps)],
  });
