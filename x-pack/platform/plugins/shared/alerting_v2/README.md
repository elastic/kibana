# Kibana Alerting v2

Alerting v2 is an ES|QL-first, append-only alerting plugin. It owns the rule model, rule execution runtime, alert lifecycle tracking, notification policies, alert actions, and the management UI used to work with all of them.

## Start here

If you want the system architecture, read [`server/README.md`](server/README.md) first. That document is the main map for how the plugin fits together.

If you want implementation detail for one subsystem, continue with:

| Area | Document |
| --- | --- |
| High-level plugin architecture | [`server/README.md`](server/README.md) |
| Rule execution pipeline | [`server/lib/rule_executor/README.md`](server/lib/rule_executor/README.md) |
| Alert lifecycle / episodes | [`server/lib/director/README.md`](server/lib/director/README.md) |
| Notification dispatch pipeline | [`server/lib/dispatcher/README.md`](server/lib/dispatcher/README.md) |
| Elasticsearch resources and schemas | [`server/resources/README.md`](server/resources/README.md) |

## Repository guide

| Path | Purpose |
| --- | --- |
| `public/` | Management UI for rules, alerts/episodes, and notification policies. |
| `server/routes/` | HTTP APIs for rules, alert actions, notification policies, and suggestions. |
| `server/saved_objects/` | Persisted models and mappings for rules and notification policies. |
| `server/lib/rule_executor/` | Per-rule Task Manager execution pipeline. |
| `server/lib/director/` | Episode state engine for alert rules. |
| `server/lib/dispatcher/` | Asynchronous notification matching, throttling, and delivery. |
| `server/resources/` | Data streams and ES|QL views (`.rule-events`, `.alert-actions`, alert episode views). |
| `server/setup/` | Dependency injection, task registration, routes, and plugin startup wiring. |

## Quick mental model

- A **rule** defines what to evaluate and how often to evaluate it.
- The **rule executor** runs that rule and writes append-only **rule events** into `.rule-events`.
- For alert rules, the **director** enriches those events with **episode** lifecycle fields.
- The **dispatcher** later reads alert episodes plus `.alert-actions`, evaluates notification policies, dispatches eligible work, and writes outcome/action history back to `.alert-actions`.
- The **public UI** and **HTTP routes** manage rules, notification policies, and user/system alert actions on top of those underlying resources.

## If you are changing...

- Rule evaluation behavior: start in [`server/lib/rule_executor/README.md`](server/lib/rule_executor/README.md)
- Alert lifecycle semantics: start in [`server/lib/director/README.md`](server/lib/director/README.md)
- Notification matching, grouping, throttling, or delivery: start in [`server/lib/dispatcher/README.md`](server/lib/dispatcher/README.md)
- Document shape or ES|QL views: start in [`server/resources/README.md`](server/resources/README.md)
- API shape or saved object contracts: inspect `server/routes/` and `server/saved_objects/` together with the relevant subsystem docs
- Workflow triggers (workflows_extensions registration, server + public wiring): start in [`common/workflows_extensions/README.md`](common/workflows_extensions/README.md)
