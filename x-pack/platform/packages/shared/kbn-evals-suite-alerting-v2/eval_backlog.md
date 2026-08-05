# Alerting V2 eval backlog

A running list of behaviours we want this suite (`@kbn/evals-suite-alerting-v2`) to evaluate.
Add new ideas under "Backlog"; move them to "Implemented" once a spec covers them.

> How to use: keep entries small and assertable. Each item should describe the user intent,
> the expected behaviour, and how we'd check it (tool call, response content, generated
> artifact, trace, etc.).

## Backlog

### Rules and queries

- [ ] **Rule queries don't use concrete indices in certain scenarios.**
  - Intent: user asks the assistant to create/update a rule whose detection query should target
    an index pattern / data view / alias rather than hardcoded concrete index names.
  - Expected: the rule's query (the ES|QL `FROM` source in `manage_rule`'s `set_query`) uses the
    appropriate abstraction (pattern, data view, alias) and avoids concrete index names in those
    scenarios.
  - How to check: inspect the `platform.alerting.manage_rule` `set_query` operation / accumulated
    rule query for the `FROM` source and assert it is not a concrete index.
  - Open question: define exactly which scenarios require this (e.g. when the user references a
    data view by name, when only a pattern is known, datastream-backed sources, etc.) and what
    counts as a "concrete index" vs an allowed pattern.

- [ ] **Generated ES|QL is valid (executes with `LIMIT 0`).**
  - Intent: any rule query the assistant composes should be syntactically and semantically valid
    against the target cluster.
  - Expected: the rule's ES|QL query runs successfully.
  - How to check: take the composed query (from `manage_rule`'s `set_query`), append/ensure a
    `LIMIT 0`, execute it via `esClient.esql.query`, and assert it returns without error. A CODE
    evaluator can do this deterministically (no judge needed).
  - Open question: confirm whether to validate the `base`/composed query as-is or the fully
    assembled breach query, and whether required fields/indices need to exist (may need seeded
    data or a validation-only path).

- [ ] **Works with federated data.**
  - Intent: user asks the assistant to create a rule against a federated / CCS / remote-cluster
    data source (or an equivalent cross-cluster index pattern).
  - Expected: the assistant can discover or accept the federated source, compose a valid rule
    query against it, and does not fail or refuse solely because the data is federated.
  - How to check: seed or configure a federated source in the eval environment; assert
    `manage_rule` compose + successful query validation / Criteria on the composed rule.
  - Open question: define the exact federated setup to seed (CCS remote, `_search` federation,
    etc.) and what "success" means when remote data is unavailable in CI.

### Workflows

- [ ] **Workflow creation prefers a new workflow over reusing an existing one (unless specified).**
  - Intent: user asks the assistant to set up a workflow (e.g. as an action-policy destination)
    without naming an existing workflow to reuse.
  - Expected: the assistant attempts to **create a new workflow** (calls
    `platform.core.generate_workflow`) rather than reusing/looking up an existing workflow. It
    should only reuse an existing workflow when the user explicitly references one.
  - How to check: inspect the tool steps for a `platform.core.generate_workflow` call (new
    workflow) vs. selecting an existing workflow id; pair with a "user specified an existing
    workflow" example that should reuse instead.
  - Open question: confirm the exact tool/step signature that distinguishes "create new" from
    "reuse existing" so the evaluator can tell them apart.

## Implemented

- [x] **Unprivileged user cannot compose rules** — a read-only user
  (`alerting_v2_rules: ['read']`, no `['all']`) asks the agent to compose a
  rule. The agent refuses and surfaces the missing privilege (`Rules: All`)
  rather than composing the rule. See
  `evals/rule_management/privileges.spec.ts`.
- [x] **Action policy uses the `manual` workflow trigger type** — notification-setup flow
  asserts the generated `workflow.yaml` has `triggers: [{ type: 'manual' }]` (plus
  `rule.id` matcher and destination = workflow attachment `workflowId`). See
  `evals/rule_management/action_policy.spec.ts`.
- [x] **Rule vs action-policy tool routing** — natural-language requests route to the correct
  tool (`manage_rule` vs `manage_action_policy`), and conceptual questions do not mutate
  state. See `evals/rule_management/rule_management.spec.ts`.
- [x] **Fully-specified compose** — a single-turn request that already supplies the index
  pattern, metric field, threshold, grouping, and duration routes to `rule-management` and
  composes a `kind: alert` rule via `manage_rule` in the same turn (no clarify needed).
  Asserts `expectedSkills` + `expectedToolIds: [manage_rule]` + Criteria on the composed rule shape.
  Discovery/mapping tools are **not** required here — when the prompt already names the index and
  fields, the agent may go straight to `manage_rule` (observed in practice). Seeds data-forge
  `fake_hosts` (`kbn-data-forge-fake_hosts.fake_hosts-*`) via `hostMetricsIndex`.
- [x] **Vague admin-console compose (discover then compose)** — colloquial prompt ("my admin
  console data", "more than 3 errors", "last 5 minutes") without a concrete index/field.
  Multi-turn: clarifying Alerting V2 vs Security on the opener is allowed; turn 2 confirms
  Alerting V2, then asserts `expectedSkills` + `expectedToolIds` (`manage_rule`,
  `get_index_mapping`) + `expectedAnyOfToolIds` (`[index_explorer, list_indices]`) +
  attachment/Criteria on the composed rule. Seeds data-forge `fake_stack` via
  `adminConsoleIndex`.
