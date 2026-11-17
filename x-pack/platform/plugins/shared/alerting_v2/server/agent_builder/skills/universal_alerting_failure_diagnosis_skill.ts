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
- Action policy failures, notification workflow failures, or connector issues. This skill only diagnoses **rule** failures. If the user asks about one of them, say it is outside what you can diagnose here and do not guess a cause.
- Classic (V1) rules or Security detection rules.

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

Match the error message against the groups below and name which part of the rule is responsible (the base query, the breach segment, the recovery query, or the no-data query).

Most errors have **several possible root causes**. Do **not** present one cause as confirmed unless you verified it. List the plausible causes, most likely first, and explain how the user can continue investigating the issue.

### Debugging tools

If index discovery tools are available, use them to verify before concluding. Here are some ways you can use index discovery tools:

1. ${platformCoreTools.listIndices} (does the pattern match any index?)
2. ${platformCoreTools.getIndexMapping} (is the field mapped, and with which type?).

These tools run with the privileges of the user in this conversation; you have no privileges of your own, so never describe a check as using "your own access". The rule, however, runs with its **rule owner's** API key, which can differ from this user's access. When you report a check, say whose access it reflects (for example "when searching as you"):
- A missing index is inconclusive: it can mean the index does not exist, or that this user does not have access to it.
- An index the user can see does not prove the rule owner can read it.

If you cannot verify a cause, say so.

### Possible root causes

The failures are grouped by error type (A to G). Each group lists the error messages it matches, then its possible root causes. In A to F, each cause has:
- **Confirm**: how to check whether that cause applies, using the error text and the debugging tools.
- **Possible fix (rule change)**: a change to the rule definition you can propose with the rule tools.
- **Possible fix (not a rule change)**: an action for the user, the index owner, or an administrator. Do not modify the rule for these.

The causes, checks, and fixes are common cases, not a complete list. If the evidence points to a different cause or a better fix, suggest that instead and explain the evidence. Do not force the failure into one of the listed causes.

#### A. Field or index not found
Messages: \`verification_exception\` with \`Unknown column [x]\` or \`Unknown index [x]\`, or \`index_not_found_exception\`.

Elasticsearch reports an index the caller cannot read exactly like an index that does not exist. For a wildcard \`FROM\` pattern that leaves nothing readable, **every** field referenced afterwards (for example the \`BY host.name\` grouping) is reported as \`Unknown column\`, even though the fields are fine. A literal index name reports \`Unknown index\` or \`index_not_found_exception\`.

Possible root causes:
1. **Typo or renamed field** in the query.
   - Confirm: ${platformCoreTools.listIndices} finds matching indices, and ${platformCoreTools.getIndexMapping} shows a similarly named field (for example a different spelling or casing) but not the exact name in the query.
   - Possible fix (rule change): correct the field name in the query.
2. **Mapping issue: the field is not mapped in any matched index.** For example the field exists only in \`_source\` (dynamic mapping disabled or \`dynamic: false\`), it only appears after the first document that contains it is indexed, it lives under a different path (\`host.name\` versus \`host.hostname\`), or a \`text\` field needs its \`.keyword\` sub-field for grouping or sorting.
   - Confirm: ${platformCoreTools.listIndices} finds matching indices, but ${platformCoreTools.getIndexMapping} shows no mapping for the field under any similar name, shows \`dynamic: false\` on the parent object, or shows the value under a different path.
   - Possible fix (rule change): if the value is mapped under a different path or a \`.keyword\` sub-field, use that field in the query.
   - Possible fix (not a rule change): otherwise have the index owner correct the mapping or ingest pipeline.
3. **The index pattern matches no index**: wrong or misspelled pattern, data not ingested yet, an ILM-deleted or rolled-over index, a concrete backing index name that no longer exists, or a missing cross-cluster alias.
   - Confirm: ${platformCoreTools.listIndices} returns no index for the pattern. Apply the access caveats under Debugging tools: the index may exist but be hidden from this user.
   - Possible fix (rule change): if the pattern is misspelled or names a concrete backing index, correct the \`FROM\` pattern (prefer the data stream or alias over a backing index).
   - Possible fix (not a rule change): if the data has not been ingested yet or was deleted, have the data owner restore ingestion; for a cross-cluster pattern, have an administrator configure the remote cluster.
4. **Missing privileges: the rule owner cannot read the index.** The rule's API key carries the owner's privileges as they were when the key was created, so a role changed later does not apply until the rule is re-saved by a user who now has access.
   - Confirm: the index and the field are visible to the user in ${platformCoreTools.listIndices} and ${platformCoreTools.getIndexMapping}, yet the rule still fails, and cause 5 does not apply. Check the role of the user who last saved the rule for \`read\` and \`view_index_metadata\` on the pattern.
   - Possible fix (not a rule change): grant the missing privileges, then re-save the rule as a user with access to refresh its API key. Do not rewrite the query for a privileges problem.
5. **The column was removed earlier in the query.** ES|QL resolves each command against the columns produced by the previous one, so after \`STATS\`, \`KEEP\`, \`DROP\`, or \`RENAME\`, a source field that is still mapped no longer exists. This often happens when \`query.breach.segment\`, a \`condition\` recovery segment, or a later command in \`query.base\` uses a field the base query already aggregated away (for example \`STATS c = COUNT(*) BY host.name | WHERE http.response.status_code >= 500\`).
   - Confirm: the field is mapped (so causes 1 to 4 do not fit), and an earlier command in the composed query does not output it: a \`STATS\` that neither groups by nor computes it, a \`KEEP\` that omits it, a \`DROP\` that removes it, or a \`RENAME\` that changes its name. The position in the error (\`line:column\`) points at the reference after that command.
   - Possible fix (rule change): move the filter or reference before the command that removes the column (for example \`WHERE\` before \`STATS\`), add the field to the \`STATS ... BY\` or \`KEEP\` list, or use the renamed column name.

#### B. Type problems
Messages: \`verification_exception\` with an argument or type message, for example "first argument of [...] must be [numeric]", "incompatible types", or "unsupported type".

Possible root causes:
1. **Wrong type for the function or comparison.** A function or comparison is applied to a field of the wrong type (for example comparing a keyword field to a number).
   - Confirm: ${platformCoreTools.getIndexMapping} shows the field with one consistent type across the matched indices, and that type is not the one the error says the function expects.
   - Possible fix (rule change): use a function or comparison that matches the field's type, or cast explicitly (\`TO_INTEGER\`, \`TO_STRING\`, \`::\`).
2. **Mapping issue: the same field is mapped with different types across the indices matched by \`FROM\`** (for example \`long\` in one index and \`keyword\` in another), so ES|QL cannot use it directly.
   - Confirm: the error lists more than one type for the field, or ${platformCoreTools.getIndexMapping} on the matched indices shows the field with different types in different indices.
   - Possible fix (rule change): cast the field explicitly to one type, or narrow the \`FROM\` pattern to indices with a consistent mapping.
   - Possible fix (not a rule change): for a lasting fix, ask the index owner to align the mappings.
3. **Text or unsupported field type.** The field is mapped as \`text\` or an unsupported type where a keyword, numeric, or date value is needed.
   - Confirm: ${platformCoreTools.getIndexMapping} shows the field as \`text\` (check for a \`.keyword\` sub-field) or another type ES|QL does not support, or the error says "unsupported type".
   - Possible fix (rule change): use the \`.keyword\` sub-field if one exists.
   - Possible fix (not a rule change): otherwise ask the index owner to add a keyword, numeric, or date mapping.
4. **Numbers or dates stored as strings.**
   - Confirm: ${platformCoreTools.getIndexMapping} shows the field as \`keyword\` while the query treats it as a number or date, and the field name or the rule's intent suggests numeric or date values.
   - Possible fix (rule change): convert the value in the query (\`TO_INTEGER\`, \`TO_DOUBLE\`, \`TO_DATETIME\`, or \`::\`).
   - Possible fix (not a rule change): for a lasting fix, ask the index owner to map the field with a numeric or date type.

#### C. Authorization and credential errors
Messages: \`security_exception\`, "unauthorized", "is unauthorized for user", or HTTP 401/403.

None of these causes is a query problem. Do not modify the rule for them.

Possible root causes:
1. **The rule owner's role lacks privileges the query needs** (\`read\` on an index, or access to a data stream or cross-cluster pattern), including a role that was changed after the rule was last saved (see A.4).
   - Confirm: the error usually names the user, the action, and the indices it was refused on (for example "action [...] is unauthorized for user [...] on indices [...]"). Compare those indices with the rule's \`FROM\` pattern.
   - Possible fix (not a rule change): grant the missing privilege to the rule owner's role, then re-save the rule as a user with the right access to refresh its API key.
2. **The rule's API key is invalid, expired, or revoked.**
   - Confirm: the error is an authentication failure (HTTP 401 or "unable to authenticate") rather than a missing privilege on an index. You cannot check the key's state from here; an administrator can check it in Stack Management under API keys.
   - Possible fix (not a rule change): re-save the rule as a user with the right access, which creates a new API key.
3. **The user who owns the rule was deleted or disabled.**
   - Confirm: also an authentication failure. You cannot check the user's state from here; an administrator can check it in Stack Management under Users.
   - Possible fix (not a rule change): re-save the rule as an active user with the right access, so the rule runs with that user's API key.

#### D. Recovery and no-data query failures
The message points at the recovery or no-data query (or the failing line sits in that query's text). These are separate ES|QL queries that can target a different index than the base query.

When each query runs can help identify which one failed:
- The recovery query only runs once an active group stops breaching, so the failure can appear intermittently.
- The no-data query runs on every execution while no-data handling is enabled.

Possible root causes: every cause in A, B, and C, applied to that separate query, with the same checks and fixes. In addition:
1. **The query was written for a different index or different grouping fields than the base query.**
   - Confirm: compare the \`FROM\` pattern and the \`BY\` fields of the \`recovery\` or \`no_data\` query with those of the base query.
   - Possible fix (rule change): correct the query in \`recovery\` or \`no_data\`, or simplify it so it reuses the base query.

#### E. Response too large
Message contains \`exceeded the maximum allowed size\` (setting \`xpack.alerting_v2.rules.run.query.maxResponseSize\`).

The limit is a server setting; do not suggest the user change it unless they administer the cluster.

Possible root causes:
1. **No \`STATS\` or \`KEEP\`**, so every matching row and column is returned.
   - Confirm: the base query has no \`STATS\` and no \`KEEP\`.
   - Possible fix (rule change): aggregate with \`STATS\`, or keep only the needed columns with \`KEEP\`.
2. **Wide fields** (large text or object fields) in the result.
   - Confirm: the query returns all columns or explicitly keeps large fields, and ${platformCoreTools.getIndexMapping} shows \`text\`, \`object\`, or \`flattened\` fields in the matched indices.
   - Possible fix (rule change): drop the wide fields with \`KEEP\` or \`DROP\`.
3. **Too many groups**, for example grouping by a high-cardinality field.
   - Confirm: the \`BY\` clause or \`grouping\` uses a field with many distinct values, such as ids, raw timestamps, or IP addresses.
   - Possible fix (rule change): group by a lower-cardinality field, or filter the groups before \`STATS\`.
4. **A lookback that is too wide** for the data volume.
   - Confirm: \`schedule.lookback\` is much longer than \`schedule.every\`, or long for a high-volume index.
   - Possible fix (rule change): shorten the lookback.

If the query is already narrow and the result still exceeds the limit:
- Possible fix (not a rule change): a cluster administrator can raise \`xpack.alerting_v2.rules.run.query.maxResponseSize\`.

#### F. Timeouts
Message contains \`Rule execution aborted\` or \`Request aborted\` (setting \`xpack.alerting_v2.rules.run.timeout\`).

Possible root causes:
1. **An expensive query**: a wide lookback, grouping by a high-cardinality field (raw timestamps, ids), or heavy aggregations such as \`COUNT_DISTINCT\`.
   - Confirm: the rule's \`schedule.lookback\`, \`BY\` fields, and aggregations show one of these, and the execution duration is close to the timeout.
   - Possible fix (rule change): make the query cheaper with a shorter lookback, fewer groups, earlier filtering or aggregation, or a cheaper aggregation.
2. **A \`FROM\` pattern that matches very many indices or shards.**
   - Confirm: ${platformCoreTools.listIndices} shows the pattern matching many indices.
   - Possible fix (rule change): narrow the \`FROM\` pattern to the indices the rule needs.
3. **A slow or overloaded cluster** (not specific to this rule).
   - Confirm: other rules or searches are slow or timing out at the same time. Ask the user if you cannot check this.
   - Possible fix (not a rule change): an administrator investigates cluster load and capacity.
4. **The timeout is set very low on this deployment.**
   - Confirm: the query is already cheap and many rules time out, or the execution duration matches a short, fixed limit.
   - Possible fix (not a rule change): a cluster administrator raises \`xpack.alerting_v2.rules.run.timeout\`.

If the query is already cheap and many rules time out, it is a cluster or configuration problem, not a rule problem.

#### G. Anything else
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
