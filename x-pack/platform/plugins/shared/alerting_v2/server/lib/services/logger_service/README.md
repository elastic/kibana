# Alerting v2 — Logging

This document is the logging standard for `alerting_v2` server code and the
reference for `LoggerService`, the plugin's single logging entry point.
Read the [rules](#rules) before adding or changing a log line. Read the
[API reference](#loggerservice-api) when you need the exact call shape.

The standard exists so that an operator reading logs from a Serverless project
can diagnose an incident without grepping free-form message strings: filter by
subsystem (`log.logger`), group by failure class (`labels.code`), correlate by
entity (`labels.rule_id`, `labels.policy_id`, ...). It follows Kibana's
[logging guidelines](../../../../../../../../../docs/extend/contributing/codebase/logging.md)
and the
[logging service tutorial](../../../../../../../../../docs/extend/tutorials/logging-service.md),
and applies ECS structured-logging conventions to this plugin's failure modes.

**Audience assumption: operator first, developer second.** `info` / `warn` /
`error` lines are for a Serverless on-call person who
needs to act. `debug` lines are for a developer reproducing a bug.
This split shapes every rule below.

## Rules

### Quick checklist

Every log line in this plugin:

1. Goes through `LoggerService` (inject `LoggerServiceToken`). Never inject the
   raw `@kbn/logging` `Logger`, except to hand it to a dependency whose API
   requires one.
2. Is emitted from a subsystem logger (`forSubsystem(...)`) bound once where
   the component is constructed, never from the root.
3. Has a short, sentence-case message that names a _class_ of event and
   contains no interpolated values.
4. Puts every variable value in `labels` (IDs or enum values only) or `error`,
   never in the message.
5. If `warn` or `error`, carries a `code` from `ALERTING_LOG_CODES`.
6. Logs nothing from the [deny list](#deny-list--never-log-at-any-level).
7. Is asserted in a unit test on `code` and `labels`, never on message text.

### 1. Log levels

`LoggerService` exposes four levels:

| Level   | Use when                                                                                                                      | Examples in this plugin                                                                                                                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error` | An operation the operator cares about failed and was not recovered. **The operator must act.**                                | A pipeline step threw (`RULE_EXECUTION_STEP_FAILED`). A saved object type failed to register (`SAVED_OBJECTS_TYPE_REGISTRATION_FAILED`). A background task could not be scheduled at boot (`TASKS_SCHEDULE_FAILED`). A new rule's task failed and the compensating delete failed too, leaving an orphan (`RULE_CREATE_ROLLBACK_FAILED`). |
| `warn`  | An operation degraded but continued: recovered, retried, skipped, or gracefully degraded. The operator watches for a pattern. | Workflow not found on dispatch (`DISPATCH_WORKFLOW_NOT_FOUND`). A name lookup failed and the page returned with `null` names (`EXECUTION_HISTORY_RULE_LOOKUP_FAILED`). A KQL matcher failed (`POLICY_MATCHER_KQL_INVALID`). The dispatcher kill switch is on (`DISPATCHER_PAUSED`, once per start).                                      |
| `info`  | **Rare.** A significant lifecycle event the operator must see even at rest. Never per execution, per tick, or per request.    | The dispatcher found no persisted watermark and is starting from the overlap window.                                                                                                                                                                                                                                                     |
| `debug` | Anything a developer or on-call needs to trace one rule or one dispatch tick. Opt-in per logger name.                         | Step start / finish. Episode transitions. Dispatch decisions. A route returning a client error.                                                                                                                                                                                                                                          |

Rules:

- If an operator cannot take an action from the line, it is `debug`, not `info`.
  Kibana's HTTP API guideline is explicit: default to `debug`, because `info`
  generates noise.
- Retried-and-succeeded operations are never `error`. Silent, or `debug`. Retry
  counts belong in metrics.
- Code paths that are _expected_ to fail sometimes ("another Kibana node did
  this first") are `debug`, not `warn`.
- `warn` and `error` **must** attach a `code` (see [log codes](#5-log-codes)).
  The type system enforces this.
- Do not log at `warn` / `error` inside a `try` that re-throws. The caller
  decides whether the failure is handled or propagated. Log once, at the
  boundary that makes that decision. The rule executor's
  `error_handling_middleware` (`RULE_EXECUTION_STEP_FAILED`) and the
  dispatcher's `execution_pipeline.ts` (`DISPATCH_STEP_FAILED`) plus its
  per-group catch (`DISPATCH_GROUP_UNHANDLED_ERROR`) are those boundaries
  today.

### 2. Message text

- **Present indicative for observations, past tense for completed outcomes.**
  Yes: `Rule not found`, `Scheduled workflow execution`, `Dispatch group failed`.
  No: `Will schedule workflow`, `Schedule workflow now`, `Rule found successfully!`.
- **Sentence case, no trailing period, ≤ 120 characters.** Matches Kibana core.
- **The message names a class of events.** It never contains an interpolated
  value. IDs go in `labels`, the exception goes in `error`.
- **No prefixes.** Do not write `[Dispatcher] ...`, `[step_name] ...`,
  `RuleExecutor: ...`. The component lives in `log.logger` (via
  `forSubsystem`) and the step in `labels.step`.
- **No stack traces, serialized objects, or query bodies in the message.**
  Those go in `error` or stay out entirely.
- **At `info` / `warn` / `error`:** no PII, no secrets, no user KQL / ES|QL /
  ES DSL, no alert document payloads, no implementation details (class names,
  file paths, internal step names). Logs are read by users, Elastic
  employees, and contributors.
- **At `debug`:** the same [deny list](#deny-list--never-log-at-any-level)
  applies. A lower level does not relax redaction, because debug output is
  routinely collected into support bundles.

Lazy vs eager messages:

- Use `() => string` for `debug` in hot paths (per-alert loops, per-step
  yields, per-row batches). It costs nothing when the level is disabled.
- Use a plain `string` for `info` / `warn` / `error` and for low-frequency
  `debug`. A lazy message is still correct there. It just buys nothing.

Before / after:

```ts
// Before — component prefix, interpolated id, variable text
logger.debug({ message: `[${step.name}] Created alert events builder for rule ${ruleId}` });

// After — class-of-event message, context in labels, logger name carries the component
logger.debug({
  message: () => 'Created alert events builder',
  labels: { step: step.name, rule_id: ruleId },
});
```

```ts
// Before — raw error text leaks the user's KQL fragment
logger.warn({ message: () => `Failed to evaluate KQL matcher for policy "${id}": ${err.message}` });

// After — synthetic message, code, id label. No `error`: the parse error quotes
// the user's expression, and `warn` copies an error's message and stack into
// ECS `error.*` unchanged.
logger.warn({
  message: 'Policy matcher failed to evaluate; treating as no-match',
  code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID,
  labels: { policy_id: actionPolicy.id },
});
```

### 3. Logger names (subsystems)

Every record carries `log.logger`. It is the primary axis an operator filters
on, so it must identify a bounded slice of behaviour, not a file.

- Root: `plugins.alertingVTwo` (set by core from the plugin id).
- One child logger per subsystem, `plugins.alertingVTwo.<subsystem>`.
  Subsystem names are camelCase and come from the closed
  `AlertingSubsystemName` union in [`types.ts`](./types.ts).
- Bind the subsystem logger **once**, where the component is constructed: in
  its constructor (`this.logger = root.forSubsystem('dispatcher')`) or in the
  `setup/bind_*.ts` function that builds it. Do not call `forSubsystem` per
  log line, and do not log from the root service.
- Never repeat the subsystem name in message text.

| Subsystem            | Covers                                                                                                                                            | Bound in                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `routes`             | HTTP route handlers.                                                                                                                              | `routes/alerting_route_context.ts`                                                                                |
| `rulesClient`        | Rule CRUD, filter parsing, bulk operations, internal rules client.                                                                                | `lib/rules_client/`, `lib/internal_rules_client/`                                                                 |
| `ruleTemplateClient` | Rule template read path.                                                                                                                          | `lib/rule_templates_client/`                                                                                      |
| `actionPolicyClient` | Action policy CRUD and API key handling.                                                                                                          | `lib/action_policy_client/`                                                                                       |
| `actionPolicyTest`   | Test-notification preview and send for action policies.                                                                                           | `lib/action_policy_test/action_policy_test_service.ts`                                                            |
| `alertsClient`       | Alert actions and episode read / write clients.                                                                                                   | `lib/alert_actions_client/`, `lib/episodes_client/`                                                               |
| `ruleExecutor`       | Rule task runner, pipeline steps, middlewares.                                                                                                    | `lib/rule_executor/task_runner.ts`                                                                                |
| `director`           | Episode state transitions. Runs inside the executor but is its own domain.                                                                        | `lib/director/director.ts`                                                                                        |
| `dispatcher`         | Dispatch task runner, pipeline steps, workflow scheduling.                                                                                        | `lib/dispatcher/dispatcher.ts`                                                                                    |
| `executionHistory`   | Rule and action policy execution-history read paths.                                                                                              | `lib/execution_history_client/`, `lib/action_policy_execution_history_client/`, `lib/services/event_log_service/` |
| `resources`          | Datastream, index template, ES\|QL view and managed workflow bootstrap, and bootstrap-time configuration such as the ES\|QL response format flag. | `setup/bind_on_start.ts`, `lib/services/resource_service/`, `lib/services/esql_response_format_service/`          |
| `tasks`              | Background tasks other than the two engine tasks. Boot-time scheduling.                                                                           | `lib/tasks/`, `lib/usage/`, `setup/bind_on_start.ts`                                                              |
| `savedObjects`       | Saved object type registration and model-version migrations.                                                                                      | `setup/bind_on_setup.ts`                                                                                          |
| `agentBuilder`       | Agent Builder tools, skills and attachments.                                                                                                      | `setup/bind_agent_builder.ts`                                                                                     |
| `events`             | Internal domain event bus, publishers, subscribers and workflow emission.                                                                         | `lib/events/`, `lib/services/workflow_service/`                                                                   |
| `telemetry`          | Event-based telemetry (EBT) reporting.                                                                                                            | `lib/services/ebt_service/ebt_service.ts`                                                                         |

The tree is split along **failure-domain** boundaries, not directory
boundaries: 16 loggers an operator can remember, not 100+ file names. The
`director` runs inside the executor pipeline but gets its own logger because it
is reasoned about independently. The `events` bus is one logger even though
publishers and subscribers live in several directories.

Shared infrastructure services (`QueryService`, `StorageService`,
`MaintenanceWindowService`, the retry service) have no logger of their own.
They take the caller's logger as a `logger` parameter on each call, so a failed
query or bulk write is reported under the caller's `log.logger` with its bound
`rule_id`, `task_id` and `step`. Do not add a subsystem for a service that only
runs on behalf of another domain.

Discover cheat sheet:

```
# All alerting v2 warnings and errors
log.logger: plugins.alertingVTwo* AND log.level: (warn OR error)

# Just the dispatcher
log.logger: "plugins.alertingVTwo.dispatcher"

# One rule's full trail across executor, director and dispatcher
labels.rule_id: "abc-123"

# One class of failure
labels.code: "DISPATCH_WORKFLOW_NOT_FOUND"

# One incident, correlated by trace
trace.id: "<id from the user's report>"
```

### 4. Labels

`labels.*` is the second axis an operator filters on. The vocabulary is closed
and typed (`AlertingLabels` in [`types.ts`](./types.ts)). Adding a key is a
deliberate one-line change, not something a call site does ad hoc.

Rules:

- **Closed vocabulary.** Only keys in `AlertingLabels`. There is no
  `Record<string, unknown>` escape hatch, by design: it prevents `rule_id` /
  `ruleId` / `ruleID` drift that silently breaks dashboards.
- **snake_case keys.** ECS convention.
- **Present when known, omitted when not.** No `"unknown"` sentinels. They
  break filter queries.
- **IDs, not names.** `rule_id`, never `rule_name`. IDs are stable. Names are
  mutable and often PII. The only non-ID labels are closed enums the plugin
  itself defines (`rule_kind`, `step`, `resource`, `error_source`, ...).
- **Low cardinality, never PII or secrets.** Values are keyword-indexed and
  searchable.
- **Bind once, not per call.** Execution-scoped labels (`rule_id`, `space_id`,
  `task_id`, ...) are bound with `withLabels` at the start of a run and travel
  with the pipeline `state`. Steps add `{ step: this.name }` on top. Per-call
  `labels` are for values only that call site knows (`policy_id`,
  `workflow_id`).

Current keys: `rule_id`, `rule_kind`, `rule_template_id`, `space_id`,
`policy_id`, `group_id`, `group_hash`, `alert_id`, `workflow_id`,
`execution_id`, `task_id`, `skill_id`, `attachment_type`, `event_type`, `step`,
`error_source`, `subsystem`, `resource`. `code` is emitted as `labels.code` but
is passed as a top-level param (see [log codes](#5-log-codes)).

#### Who a failure is attributed to (`error_source`)

`RULE_EXECUTION_STEP_FAILED` carries the label `error_source`:

| Value       | Meaning                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `user`      | The step tagged the error as a user error (for example an invalid rule query). Task Manager counts it in `user_errors`. |
| `framework` | Every other failure. Task Manager counts it in `framework_errors`.                                                      |

The value comes from the error source Task Manager already holds for the error
(`resolveErrorSource` in [`../../errors/error_source.ts`](../../errors/error_source.ts)),
so it always agrees with those counters. Filter on
`labels.error_source: framework` to leave out failures that the rule's owner has
to fix.

Not a label:

- **Errors.** Pass the exception as `error`. The service emits ECS
  `error.{message,type,stack_trace}`. Never `labels.error_*`.
- **Trace / span IDs.** Set automatically by core when logging under an
  OpenTelemetry span (`ApmMiddleware`, `withDispatcherSpan`). Do not set them.
- **Timestamps, level, logger name.** Set by core.
- **Counts, sizes, durations.** Those are metrics (`@kbn/metrics`), not labels.
  Numeric cardinality kills keyword fields. If a count is essential to a
  _message_ (e.g. "3 of 12 failed") it may appear in the message text, but it
  is never a label.

### 5. Log codes

Every `warn` and `error` carries a `code` from `ALERTING_LOG_CODES` in
[`../../errors/error_codes.ts`](../../errors/error_codes.ts). An operator
looking at a spike filters `labels.code: "..."` and sees the count over the last
hour instead of grepping messages.

Naming (the JSDoc above `ALERTING_LOG_CODES` is the source of truth):

- `<DOMAIN>_<WHAT_HAPPENED>`.
- The domain prefix matches the subsystem that owns the failure, so an operator
  can filter a whole area with a prefix: `ROUTES_`, `RULE_` / `RULE_EXECUTION_`
  / `RULE_TEMPLATE_`, `DIRECTOR_`, `DISPATCH_` / `DISPATCHER_`, `POLICY_` /
  `ACTION_POLICY_`, `EXECUTION_HISTORY_`, `EVENTS_`, `STORAGE_`, `QUERY_`,
  `RESOURCES_`, `RETRY_`, `MAINTENANCE_WINDOW_`, `SAVED_OBJECTS_`,
  `AGENT_BUILDER_`, `TASKS_`, `TELEMETRY_`. Add the prefix to that JSDoc when you add a domain.
- The suffix encodes the outcome. Warns (degraded but continued): `_FAILED`,
  `_SKIPPED`, `_TIMED_OUT`, `_NOT_FOUND`, `_LOOKUP_FAILED`, `_DEGRADED`,
  `_INVALID`, `_UNMAPPED`. Errors (could not complete): `_FAILED`,
  `_UNAVAILABLE`, `_INVALID`, `_UNRECOVERABLE`. A few codes that predate the
  standard use other suffixes. They keep their names because renaming is
  breaking, but new codes pick from this list.

Rules:

- **One code per failure class, not per call site.** A new code means a
  distinct failure with a distinct operator response. Deduplicate before
  adding. When one code covers several sites, carry the discriminator in a
  label: `RULE_EXECUTION_STEP_FAILED` + `labels.step`,
  `TASKS_SCHEDULE_FAILED` + `labels.task_id`.
- **One code per call site.** Do not compute `code = a || b`. Split into two
  log lines.
- **Every code has a JSDoc** saying when it fires and what degraded. That JSDoc
  is the operator-facing runbook entry.
- **Renaming or removing a code is a breaking change** for dashboards and
  log-based alerts. Adding one is backwards compatible.
- Log codes are never serialized into HTTP responses. The HTTP contract uses
  the separate `ALERTING_ERROR_CODES` catalog, documented in
  [`../../errors/README.md`](../../errors/README.md).

### 6. Redaction

Kibana's guideline: **do not log sensitive information, regardless of level.**
Enforcement in this plugin is an allow list plus PR review. There is no
rewrite appender. The rule applies to _values_, not field names:
`labels.rule_id: "abc-123"` is fine. `labels.matcher: "user.email: sre@..."`
is not.

#### Allow list — safe at every level

| Category                                | Examples                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Opaque IDs                              | `rule_id`, `policy_id`, `group_id`, `group_hash`, `alert_id`, `workflow_id`, `task_id`, `execution_id`, `space_id` |
| Enum values                             | `rule.kind`, `episode.status`, `event.outcome`, `error_source`, log codes, step names, task types, resource names  |
| Counts, cardinalities, durations        | batch size, matched-rule count, dispatch latency, retry attempt (in messages or metrics, not labels)               |
| Error class, code, stack trace          | Ours by construction. See downstream errors below                                                                  |
| Kibana / plugin / feature-flag versions | `plugin.version`, `alerting:v2:enabled`                                                                            |

#### Deny list — never log at any level

| Category                        | Examples                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Credentials                     | API keys, bearer tokens, cookies, session IDs, any `authorization` value                                                        |
| User-supplied query bodies      | Rule matcher KQL, ES DSL, ES\|QL, Agent Builder tool inputs                                                                     |
| Alert / event / document bodies | `.rule-events` rows, `.alert-actions` rows, alert episode rows, query results, incoming ES documents                            |
| Rule / policy names and text    | `rule.name`, `rule.description`, `actionPolicy.name`, `actionPolicy.description`, `tags` — user-authored free text              |
| User identity                   | `user.username`, `user.email`, `user.full_name`, `user.roles` beyond what core emits at request scope. Use the audit logger.    |
| URLs from user input            | Webhook and connector URLs — they often carry tokens                                                                            |
| The dispatcher's fake request   | `dispatch_step.ts` builds a `KibanaRequest` carrying `authorization: ApiKey ...`. Never log it. Log `labels.policy_id` instead. |

#### Downstream error messages

Errors from Elasticsearch, the saved objects client, or the workflows plugin
sometimes echo user input.

- `error.type`, `error.code`, HTTP status: safe.
- `error.message`: safe **unless** the code path is known to echo user input.
  KQL / ES|QL parse errors quote the offending fragment.
- `error.stack_trace`: the frames are code paths, but the first line of a
  Node.js stack repeats the message (`ResponseError: ...`), so it is exactly
  as safe as `error.message`.

A `message` override is not redaction. On `error`, the service writes the
override to the log line and to ECS `error.message`, but copies the stack
unchanged. On `warn`, the override changes only the log line, and
`error.message` keeps the original text. Where the error may echo user input,
do not pass the original through:

- On `warn`, omit `error`. The `code` identifies the failure class.
- On `error`, pass a sanitized error that carries the synthetic message and no
  original stack. `error.type` becomes `Error`, so rely on `labels.code`.

```ts
logger.error({
  error: isEsqlUserError(error) ? new Error('Rule query failed to parse or verify') : error,
  code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
});
```

When in doubt, drop the original error and rely on `labels.code`.

### 7. Review checklist

For any PR that adds or changes a log line, the reviewer asks, in order:

1. Does it go through `LoggerService` from a subsystem logger?
2. Is the level right? Could an operator act on it? If not, `debug`.
3. Does `warn` / `error` carry the right `code`, with a JSDoc on the catalog
   entry? Is a new code really a new failure class?
4. Is every value interpolated into the message, or placed in `labels`, on the
   allow list?
5. Does the `error` come from a downstream service that might echo user
   input? Omit it or pass a sanitized error. A `message` override alone
   leaves the text in `error.stack_trace`, and on `warn` in `error.message`.
6. Is the log inside a hot loop that would emit one line per user document?
   Aggregate or drop.
7. Does a unit test assert `code` and `labels`, and not the message text?
8. Novel value type, label key, or subsystem? Amend `types.ts` and this document
   before merging.

Author rules of thumb:

- **IDs beat names.** Every time.
- **Counts beat contents.** "Failed to enrich 3 of 12 events" beats dumping the
  events.
- **Codes beat messages.** `labels.code: "POLICY_MATCHER_KQL_INVALID"` is a
  better signal than the KQL parser's raw text.
- **Bind beats repeat.** Attach execution context once with `withLabels`. Do
  not re-pass `rule_id` on every call.

### 8. Testing

Use `createLoggerService()` from [`logger_service.mock.ts`](./logger_service.mock.ts).
It returns the real `LoggerService` wrapping a mocked core `Logger`, so child
loggers from `forSubsystem` / `withLabels` all write to the same mock:

```ts
const { loggerService, mockLogger } = createLoggerService();

expect(mockLogger.warn).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    labels: expect.objectContaining({
      code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID,
      policy_id: 'p1',
    }),
  })
);
```

Assert on `code` and `labels`. They are the contract: dashboards and log-based
alerts key on them, and renaming one is a breaking change. Do not assert
message text. It is human-facing, changes freely, and a test that pins it fails
on every wording tweak without protecting anything an operator depends on. Use
`expect.any(String)` for the first argument, or `expect.any(Function)` for a
lazy message.

The one exception is redaction. When a call site replaces the message or the
error to keep user input out of the log, assert that the raw text is absent
from the message and from the `error` meta with
`expect.not.stringContaining(...)`, not what the replacement says.

## LoggerService API

`LoggerService` wraps the core `Logger` and enforces the rules above at the
type level: every `warn` / `error` carries a catalog `code`, and structured
context travels in a closed set of `labels` rather than being interpolated into
message text.

Inject `LoggerServiceToken`, never a raw `@kbn/logging` `Logger`.

```ts
logger.debug({ message, labels });
logger.info({ message, labels });
logger.warn({ message, code, labels, error });
logger.error({ message, error, code, labels });
logger.forSubsystem(name); // → LoggerServiceContract
logger.withLabels(labels); // → LoggerServiceContract
```

| Param     | Notes                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message` | `string` or `() => string`. Use the lazy form for `debug` in hot paths. It costs nothing when the level is disabled. Optional on `error`, where it defaults to the error's own message.                                |
| `code`    | Required on `warn` / `error`. Must come from `ALERTING_LOG_CODES` (`../../errors/error_codes.ts`). Emitted as ECS `labels.code`.                                                                                       |
| `labels`  | Optional entity identifiers from `AlertingLabels`. IDs or closed enum values only — never names, user input, counts, or durations.                                                                                     |
| `error`   | `unknown`. Non-`Error` values are wrapped internally, so `catch (err)` blocks pass `err` straight through. Emitted as ECS `error.{message,type,stack_trace}`, with `type` taken from the exception's constructor name. |

Overriding `message` on `error` replaces the error's message in both the log
record and ECS `error.message`. The stack trace is copied as is, and `warn`
never rewrites `error.message`, so an override alone does not redact a
downstream error (see [redaction](#6-redaction)).

### Subsystem loggers

`forSubsystem(name)` returns a service whose records carry
`log.logger: plugins.alertingVTwo.<name>`.

There is one root `LoggerService` binding and no per-subsystem DI tokens.
`forSubsystem` instances are memoized per name.

```ts
@injectable()
export class Dispatcher {
  private readonly parentLogger: LoggerServiceContract;

  constructor(@inject(LoggerServiceToken) logger: LoggerServiceContract) {
    this.parentLogger = logger.forSubsystem('dispatcher');
  }
}
```

### Bound labels (`withLabels`)

`withLabels(labels)` returns an **immutable** child that merges the given labels
into every subsequent log record. Prefer composing:

```ts
const logger = root.forSubsystem('ruleExecutor').withLabels({ rule_id, space_id, task_id });
```

Children never mutate the parent. Concurrent executions each bind their own
child — do not write execution labels onto the shared singleton.

Per-call `labels` override bound keys of the same name. Bound labels and
per-call labels are both emitted under ECS `labels.*`.

#### Execution-path binding

| Subsystem      | Where bound                                                                                                                                                   | Typical labels                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ruleExecutor` | `RuleExecutorTaskRunner` once per task. `rule_kind` re-bound after `fetch_rule`. `step` on pipeline/middleware. `error_source` in `error_handling_middleware` | `rule_id`, `space_id`, `task_id`, `execution_id`, `rule_kind`, `step`, `error_source`                                 |
| `dispatcher`   | `DispatcherService.run` once per tick. `step` in `execution_pipeline.ts`. Entity labels on concrete log calls                                                 | `task_id`, `step`, plus `rule_id` / `space_id` / `policy_id` / `group_id` / `workflow_id` / `execution_id` when known |
| `director`     | `DirectorService.run` once per run                                                                                                                            | `rule_id`, `rule_kind`, `space_id` (and `group_hash` / `alert_id` on transition debug)                                |

Pass the bound logger through pipeline `input` / `state` (or a local `const`
in director). Steps log via `state.logger.withLabels({ step: this.name })`, not
the root singleton:

```ts
const logger = state.logger.withLabels({ step: this.name });
logger.debug({ message: 'Starting fetch rule step' });
```

Prefer `log.logger` via `forSubsystem` over a `labels.subsystem` meta field.
Set `subsystem` only if a call site needs meta-filter parity without logger-name
filters.

### Operator filters (`kibana.yml`)

Raise verbosity for one rule without changing the global level:

```yaml
logging:
  loggers:
    - name: plugins.alertingVTwo
      level: warn
      filters:
        - type: meta
          match:
            '[labels.rule_id]': 7c9e6f5a-1111-2222-3333-444444444444
          level: debug
```

Filter by kind or dispatcher tick:

```yaml
logging:
  loggers:
    - name: plugins.alertingVTwo.ruleExecutor
      level: warn
      filters:
        - type: meta
          match:
            '[labels.rule_kind]': alert
          level: debug
    - name: plugins.alertingVTwo.dispatcher
      level: warn
      filters:
        - type: meta
          match:
            '[labels.task_id]': alerting_v2:dispatcher
          level: debug
```

### Extending the vocabulary

Adding a code, a label, or a subsystem is a deliberate one-line type change:

- **Code** — add an entry to `ALERTING_LOG_CODES` (`../../errors/error_codes.ts`)
  under the matching domain banner, with a JSDoc describing when it fires and
  what degraded. A new domain prefix also goes into the catalog's header
  JSDoc. Renaming or removing a code is a breaking change for log-based
  monitoring.
- **Label** — add a key to `AlertingLabels` (`types.ts`) and to the list in
  [labels](#4-labels). Keys are snake_case. Values must be low-cardinality
  identifiers or closed enum values.
- **Subsystem** — add a name to `AlertingSubsystemName` (`types.ts`) and a row
  to the table in [logger names](#3-logger-names-subsystems). A subsystem is a
  failure domain an operator would want to enable `debug` on independently,
  not a directory.

### What the API deliberately does not include

- No `warn(message: string)` overload. Every call takes the params object.
- No `child(anyString)` escape hatch. Only `AlertingSubsystemName` values.
- No free-form `meta` for arbitrary ECS fields. If a call site needs something
  the catalog does not cover, this document and `types.ts` are amended, not
  the call site.
- No structured `event.*` fields. Those belong to audit logging, which goes
  through the security plugin's audit logger, not this service.
