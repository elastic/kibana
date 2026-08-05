# Alerting v2 — LoggerService

`LoggerService` is the only logging entry point for plugin server code. It wraps
the core `Logger` and enforces the plugin's logging standard at the type level:
every `warn` / `error` carries a catalog `code`, and structured context travels
in a closed set of `labels` rather than being interpolated into message text.

Inject `LoggerServiceToken`, never a raw `@kbn/logging` `Logger`.

## API

```ts
logger.debug({ message, labels? });
logger.info({ message, labels? });
logger.warn({ message, code, labels?, error? });
logger.error({ message?, error, code, labels? });
logger.forSubsystem(name); // → LoggerServiceContract
```

| Param | Notes |
| ----- | ----- |
| `message` | `string` or `() => string`. Use the lazy form for `debug` in hot paths; it costs nothing when the level is disabled. Optional on `error`, where it defaults to the error's own message. |
| `code` | Required on `warn` / `error`. Must come from `ALERTING_V2_LOG_CODES` (`../../errors/error_codes.ts`). Emitted as ECS `labels.code`. |
| `labels` | Optional entity identifiers from `AlertingLabels`. IDs only — never names, user input, counts, or durations. |
| `error` | `unknown`. Non-`Error` values are wrapped internally, so `catch (err)` blocks pass `err` straight through. Emitted as ECS `error.{message,type,stack_trace}`, with `type` taken from the exception's constructor name. |

## What goes where

The message names a *class* of event; everything variable belongs in `labels`:

```ts
this.logger.warn({
  message: 'Workflow not found, skipping dispatch',
  code: ALERTING_V2_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
  labels: { workflow_id: workflowId, group_id: group.id, policy_id: group.policyId },
});
```

Do not prefix messages with the emitting component (`[Dispatcher]`,
`RuleExecutor:`). That belongs in the logger name — see `forSubsystem` below.

Overriding `message` on `error` replaces the error's message in both the log
record and ECS `error.message`. Use it when the underlying message would echo
user input (KQL / ES|QL parser errors quote the offending fragment):

```ts
this.logger.error({
  message: 'Rule query failed to parse or verify',
  error: err,
  code: ALERTING_V2_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
  labels: { rule_id: input.ruleId },
});
```

## Subsystem loggers

`forSubsystem(name)` returns a service whose records carry
`log.logger: plugins.alertingV2.<name>` — the primary axis an operator filters
on. Bind it once, in the constructor of the class that needs it:

```ts
constructor(@inject(LoggerServiceToken) logger: LoggerServiceContract) {
  this.logger = logger.forSubsystem('dispatcher');
}
```

There is one root `LoggerService` binding and no per-subsystem DI tokens.
Instances are memoized per name, so calling it repeatedly is cheap.

## Testing

Use `createLoggerService()` from `logger_service.mock.ts`; it returns the real
service wrapping a mocked core `Logger`. Child loggers from `forSubsystem` write
to the same mock, so assertions hold regardless of scoping:

```ts
const { loggerService, mockLogger } = createLoggerService();

expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
  labels: { code: ALERTING_V2_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND },
});
```

## Extending the vocabulary

Adding a code, a label, or a subsystem is a deliberate one-line type change:

- **Code** — add an entry to `ALERTING_V2_LOG_CODES` (`../../errors/error_codes.ts`)
  with a JSDoc describing when it fires and what degraded. Renaming or removing
  one is a breaking change for log-based monitoring.
- **Label** — add a key to `AlertingLabels` (`types.ts`). Keys are snake_case;
  values must be low-cardinality identifiers.
- **Subsystem** — add a name to `AlertingSubsystemName` (`types.ts`).
