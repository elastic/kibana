# Alerting V2 — Agent Builder Skills & Tools

This document tracks the Agent Builder tools and skills that expose the Alerting V2 system to Kibana's AI agent framework.

---

## Data Streams & ES|QL Views

All tools and skills should reference ES|QL views as the primary query target, with fallback to the raw data stream if the view is unavailable.

| ES|QL View | Raw Data Stream | Purpose |
|------------|----------------|---------|
| `$.alerting-events` | `.alerting-events` | All rule execution events (signal + alert) |
| `$.alerting-episodes` | `.alerting-events` (derived) | Collapsed episode state with duration — one row per episode showing current state |
| `$.alerting-actions` | `.alerting-actions` | Dispatcher decisions and user actions (fire, suppress, ack, snooze, etc.) |

### $.alerting-episodes View Query

Episodes are derived by collapsing the event stream — there is no standalone "episode document":

```esql
FROM .alerting-events
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC
```

---

## Server-Side Built-In Tools

These run on the server with access to `esClient`, `request`, etc. and return `ToolResult` data to the LLM.

### 1. `platform.alerting_v2.list_rules` — ✅ Implemented

**Purpose:** List and search alerting rules with optional filtering by status, kind, labels, or owner.

**Schema:**
```ts
z.object({
  page: z.number().optional().describe('Page number (1-based). Defaults to 1.'),
  perPage: z.number().optional().describe('Results per page. Defaults to 20.'),
  filter: z.string().optional().describe(
    'KQL filter string. Allowed fields: id, kind, enabled, metadata.name, metadata.owner, metadata.labels. ' +
    'Example: "enabled: true AND kind: alert"'
  ),
})
```

**Handler notes:**
- Delegates to `RulesClient.findRules()`.
- Returns `ToolResultType.other` with the `{ items, total, page, perPage }` response.
- Should format rule summaries (id, name, kind, enabled, schedule, source index) for LLM consumption rather than returning raw objects.

---

### 2. `platform.alerting_v2.get_rule` — ✅ Implemented

**Purpose:** Retrieve full details of a single rule by ID — including its ES|QL query, schedule, grouping, recovery policy, and state transition configuration.

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to retrieve.'),
})
```

---

### 3. `platform.alerting_v2.create_rule` — ✅ Implemented

**Purpose:** Create a new alerting rule from a fully specified definition.

**Schema:**
```ts
z.object({
  kind: z.enum(['alert', 'signal']).describe(
    '"alert" rule events carry additional episode.* fields for lifecycle tracking and can trigger notification policies. ' +
    '"signal" rule events are point-in-time observations with no episode fields and no lifecycle tracking.'
  ),
  metadata: z.object({
    name: z.string().describe('Human-readable rule name.'),
    description: z.string().optional().describe('Longer description of the rule purpose.'),
    owner: z.string().optional().describe('Team or user who owns this rule.'),
    labels: z.array(z.string()).optional().describe('Labels for categorization and filtering.'),
  }),
  time_field: z.string().describe('The timestamp field used for time-range queries (e.g. "@timestamp").'),
  schedule: z.object({
    every: z.string().describe('ISO 8601 duration for execution interval (e.g. "5m", "1h").'),
    lookback: z.string().optional().describe('Lookback window override. Defaults to the schedule interval.'),
  }),
  evaluation: z.object({
    query: z.object({
      base: z.string().describe('The base ES|QL query to evaluate (e.g. "FROM logs-* | WHERE status >= 500").'),
      condition: z.string().optional().describe('Additional condition appended to the base query.'),
    }),
  }),
  grouping: z.object({
    fields: z.array(z.string()).describe('Fields to group alerts by (e.g. ["host.name", "service.name"]).'),
  }).optional(),
  state_transition: z.object({
    pending_count: z.number().optional().describe('Number of consecutive breaches before transitioning from pending to active.'),
    pending_timeframe: z.string().optional().describe('Time window for pending threshold.'),
    pending_operator: z.enum(['AND', 'OR']).optional(),
    recovering_count: z.number().optional(),
    recovering_timeframe: z.string().optional(),
    recovering_operator: z.enum(['AND', 'OR']).optional(),
  }).optional(),
})
```

**Handler notes:**
- Validates ES|QL query syntax before creating.
- Uses `events.reportProgress()` to stream creation steps to the thinking panel.
- Uses `confirmation: { askUser: 'always' }` for human-in-the-loop confirmation.

---

### 4. `platform.alerting_v2.update_rule` — ✅ Implemented

**Purpose:** Update an existing rule's configuration (schedule, query, metadata, state transitions, etc.).

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to update.'),
  updates: z.object({
    metadata: z.object({ /* same as create */ }).optional(),
    schedule: z.object({ /* same as create */ }).optional(),
    evaluation: z.object({ /* same as create */ }).optional(),
    state_transition: z.object({ /* same as create */ }).optional(),
  }).describe('Partial update — only provided fields are changed.'),
})
```

---

### 5. `platform.alerting_v2.toggle_rule` — ✅ Implemented

**Purpose:** Enable or disable a single rule.

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to enable or disable.'),
  enabled: z.boolean().describe('Set to true to enable, false to disable.'),
})
```

---

### 6. `platform.alerting_v2.bulk_manage_rules` — ✅ Implemented

**Purpose:** Perform bulk operations (enable, disable, delete) on multiple rules by IDs or KQL filter.

**Schema:**
```ts
z.object({
  action: z.enum(['enable', 'disable', 'delete']).describe('The bulk operation to perform.'),
  ids: z.array(z.string()).optional().describe('Explicit list of rule IDs to operate on.'),
  filter: z.string().optional().describe('KQL filter to match rules. Mutually exclusive with ids.'),
})
```

**Handler notes:**
- Should use `prompts` for human-in-the-loop confirmation before destructive operations (especially delete).
- Report progress for large batches.

---

### 7. `platform.alerting_v2.query_alert_events` — ✅ Implemented

**Purpose:** Query the `$.alerting-events` ES|QL view to retrieve recent alert firings, recoveries, and episode state.

**Queries:** `FROM $.alerting-events` with optional filters for time range, rule ID, and episode status.

**Notes:**
- Should surface episode lifecycle context (episode ID, status transitions, group hash).
- Results include `ToolResultType.esqlResults` for visualization rendering in the UI.

---

### 8. `platform.alerting_v2.list_notification_policies` — ✅ Implemented

**Purpose:** List notification policies with their matchers, status (enabled/disabled/snoozed), and linked actions.

---

### 9. `platform.alerting_v2.explain_rule_query` — ✅ Implemented

**Purpose:** Takes a rule ID, fetches its ES|QL query, executes a dry-run against the current data, and returns a natural-language explanation of what it evaluates and sample matching documents.

**Handler notes:**
- Execute the rule's base query with a small LIMIT.
- Use `modelProvider.getDefaultModel()` to generate a plain-language summary of the query logic.
- Return both the raw results and the explanation.

---

### 10. `platform.alerting_v2.validate_esql_query` — ✅ Implemented

**Purpose:** Validate an ES|QL query string for syntax correctness and field resolution against the target index.

**Schema:**
```ts
z.object({
  query: z.string().describe('The ES|QL query to validate.'),
})
```

---

## Suggested Browser API Tools

Browser API tools run in the **browser** and are registered by the page embedding the assistant. They are **one-way** — the LLM triggers them but results are NOT returned. The handler signature is `(params: TParams) => void | Promise<void>`.

Browser API tool IDs must use underscores (not dots) to comply with the OpenAI API pattern `^[a-zA-Z0-9_-]+$`.

These tools would be registered from the alerting_v2 plugin's **public** side when the rules list page or rule detail page hosts the assistant conversation.

### 1. `alerting_navigate_to_rule`

**Purpose:** Navigate the user to a specific rule's detail page.

**Why:** After the agent identifies a problematic rule via `list_rules` or `query_alert_events`, it can send the user directly to it rather than just providing an ID.

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to navigate to.'),
})
```

**Handler:** Calls `application.navigateToUrl()` with the rule detail URL.

---

### 2. `alerting_navigate_to_rule_editor`

**Purpose:** Open the rule editor for a specific rule, optionally pre-selecting a section to edit.

**Why:** When the agent recommends tuning a rule's schedule, query, or thresholds, it can open the editor directly to the relevant section.

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to edit.'),
  section: z.enum(['query', 'schedule', 'state_transition', 'grouping', 'metadata'])
    .optional()
    .describe('Section of the editor to focus on.'),
})
```

**Handler:** Navigates to the rule form page with the rule ID pre-loaded.

---

### 3. `alerting_apply_rules_list_filter`

**Purpose:** Apply a filter to the rules list page the user is currently viewing.

**Why:** When the agent says "you have 12 disabled rules" or "these rules are noisy", it can filter the list to show exactly those rules instead of making the user manually apply filters.

**Schema:**
```ts
z.object({
  filter: z.string().optional().describe('KQL filter to apply (e.g. "enabled: false").'),
  kind: z.enum(['alert', 'signal']).optional().describe('Filter by rule kind.'),
  enabled: z.boolean().optional().describe('Filter by enabled state.'),
  labels: z.array(z.string()).optional().describe('Filter by labels.'),
})
```

**Handler:** Updates the rules list page state/URL params to apply the filter.

---

### 4. `alerting_set_time_range`

**Purpose:** Set the time range on the current alerting page (rules list or episode view).

**Why:** When investigating recent alerts or reviewing episode history, the agent can adjust the time range to match the relevant window.

**Schema:**
```ts
z.object({
  from: z.string().describe('Start of time range (e.g. "now-1h", "2026-01-01T00:00:00Z").'),
  to: z.string().optional().describe('End of time range. Defaults to "now".'),
})
```

**Handler:** Updates the time picker state on the current page.

---

### 5. `alerting_highlight_rule`

**Purpose:** Visually highlight a specific rule in the rules list table.

**Why:** When the agent references a specific rule in conversation ("the rule 'High CPU Alert' is flapping"), it can draw the user's attention to it in the list.

**Schema:**
```ts
z.object({
  ruleId: z.string().describe('The ID of the rule to highlight.'),
})
```

**Handler:** Scrolls to and visually highlights the row in the rules list table.

---

### 6. `alerting_open_episode_detail`

**Purpose:** Open the detail view for a specific alert episode.

**Why:** When the agent identifies a specific episode during investigation, it can open the detail view so the user can see the full timeline and context.

**Schema:**
```ts
z.object({
  episodeId: z.string().describe('The episode ID to open.'),
  ruleId: z.string().optional().describe('The rule ID (helps construct the URL if needed).'),
})
```

**Handler:** Navigates to or opens a flyout for the episode detail view.

---

## Skills — ✅ All Implemented

All skills are registered via `agentBuilder.skills.register()` in `server/agent_builder/skills/index.ts` using `defineSkillType` with `basePath: 'skills/platform/alerting'`.

| Priority | Skill | Description | Registry Tools |
|----------|-------|-------------|----------------|
| **P1** | `alert-investigation` | Investigating rule firings, episode lifecycle, and diagnosing alert behaviour. Includes `referencedContent` for episode lifecycle state machine. | `get_rule`, `query_alert_events`, `explain_rule_query` |
| **P1** | `alert-rule-creation` | Step-by-step rule creation: ES\|QL query construction, kind selection, schedule, grouping, state transitions. Includes ES\|QL query examples. | `create_rule`, `validate_esql_query`, `list_notification_policies` |
| **P1** | `alert-episodes` | Fetching and understanding alert episodes — explains the `$.alerting-episodes` view, how collapsing works, ready-to-use ES\|QL queries, and raw fallback. Includes `referencedContent` for `.alerting-events` schema. | `query_alert_events`, `get_rule`, `list_rules` |
| **P2** | `alert-rule-tuning` | Diagnosing noisy, flapping, or under-performing rules. Tuning strategies for both alert and signal kinds. | `get_rule`, `query_alert_events`, `explain_rule_query`, `update_rule`, `validate_esql_query` |
| **P3** | `notification-policy-management` | Understanding and managing notification policies — matchers, connectors, throttling, suppression, snooze. | `list_notification_policies`, `get_rule`, `query_alert_events` |
| **P3** | `alerting-rules-overview` | High-level overview of rule types, event schema comparison, configuration fields, and browsing/filtering rules. | `list_rules`, `get_rule` |
| **P3** | `workflow-trigger-investigation` | Determining whether an episode triggered a workflow via the notification pipeline. Covers `$.alerting-actions` view with `fire`, `suppress`, `notified`, `unmatched` action types. Includes `referencedContent` for `.alerting-actions` schema. | `get_rule`, `query_alert_events`, `list_notification_policies` |

---

## Implementation Priority

| Priority | Item | Type | Status | Rationale |
|----------|------|------|--------|-----------|
| **P0** | `list_rules` | Server Tool | ✅ | Foundation for all rule-related conversations |
| **P0** | `get_rule` | Server Tool | ✅ | Required for investigation and tuning workflows |
| **P0** | `query_alert_events` | Server Tool | ✅ | Core investigative capability |
| **P1** | `alert-investigation` | Skill | ✅ | Highest-value user workflow — "why did this alert fire?" |
| **P1** | `alert-episodes` | Skill | ✅ | "What alerts are currently firing?" — derived episode state |
| **P1** | `create_rule` | Server Tool | ✅ | Enables conversational rule authoring |
| **P1** | `alert-rule-creation` | Skill | ✅ | Orchestrates the multi-step creation flow |
| **P1** | `toggle_rule` | Server Tool | ✅ | Common operational action |
| **P2** | `alert-rule-tuning` | Skill | ✅ | High value but depends on P0/P1 tools existing |
| **P2** | `update_rule` | Server Tool | ✅ | Required for tuning workflows |
| **P2** | `explain_rule_query` | Server Tool | ✅ | Enhances investigation but not strictly required |
| **P2** | `bulk_manage_rules` | Server Tool | ✅ | Operational efficiency for advanced users |
| **P2** | `validate_esql_query` | Server Tool | ✅ | Improves creation reliability |
| **P3** | `list_notification_policies` | Server Tool | ✅ | Notification management secondary to rule management |
| **P3** | `notification-policy-management` | Skill | ✅ | Lower frequency user need |
| **P3** | `alerting-rules-overview` | Skill | ✅ | Nice-to-have posture summary |
| **P3** | `workflow-trigger-investigation` | Skill | ✅ | Auditing dispatcher decisions |
| **P3** | `alerting_navigate_to_rule` | Browser Tool | 📋 Suggested | Navigate to rule detail page |
| **P3** | `alerting_navigate_to_rule_editor` | Browser Tool | 📋 Suggested | Open rule editor to specific section |
| **P3** | `alerting_apply_rules_list_filter` | Browser Tool | 📋 Suggested | Filter the rules list from conversation |
| **P3** | `alerting_set_time_range` | Browser Tool | 📋 Suggested | Adjust time range on current page |
| **P3** | `alerting_highlight_rule` | Browser Tool | 📋 Suggested | Scroll to and highlight a rule in the list |
| **P3** | `alerting_open_episode_detail` | Browser Tool | 📋 Suggested | Open episode detail view/flyout |

---

## Namespace & Allow List Considerations

All **server-side** tools use the `platform.alerting_v2.*` namespace prefix. This namespace must be:

1. Added to `protectedNamespaces` in `agent-builder-common/base/namespaces.ts`
2. Each tool ID added to `AGENT_BUILDER_BUILTIN_TOOLS` in `agent-builder-server/allow_lists.ts`

**Browser API tools** use underscored IDs (e.g. `alerting_navigate_to_rule`) and are registered by the embedder — they don't need server-side allow-listing.

## Skills Directory Structure

Skills live under `skills/platform/alerting`:

```ts
type SkillsDirectoryStructure = Directory<{
  skills: Directory<{
    platform: FileDirectory<{
      alerting:       FileDirectory;  // alerting v2 skills
      dashboard:      FileDirectory;
      visualization:  FileDirectory;
      workflows:      FileDirectory;
    }>;
    // ...
  }>;
}>;
```
