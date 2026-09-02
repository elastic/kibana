# Context Engine Telemetry

The Context Engine plugin reports event-based telemetry (EBT) for Knowledge Indicator (KI) writes. `ContextEngineAnalyticsService` (`analytics_service.ts`) owns event type registration through `core.analytics.registerEventType` and all reporting.

## Privacy rules

- KI free text is never reported. No `title`, `description`, `content`, `tags`, or `attributes` values appear in any payload.

- AI index ids are reported verbatim.

- Failures carry the error type in `error_type`, never the error message.

- A reporting failure never fails or alters a write. Errors thrown while reporting are caught and logged at `debug`.

## Gating

All reporting is gated on the `contextEngine:enabled` advanced setting. KI workflow steps fail before any write happens, so no event fires when the setting is off.

## Events

| Event type | Fired when |
|---|---|
| `context_engine_ki_create` | The `context-engine.createKi` workflow step indexes a KI document, or fails to. |
| `context_engine_ki_update` | The `context-engine.updateKi` workflow step updates a KI document, or fails to. |
| `context_engine_ki_delete` | The `context-engine.deleteKi` workflow step deletes a KI document, or fails to. |

The AI index HTTP routes are not instrumented. Their ECS audit events in `server/routes/audit_events.ts` remain the record of AI index reads and writes.

A cancelled workflow run reports `outcome: aborted` instead of `failure`, keyed off the error itself (`RequestAbortedError`/`AbortError`) so a genuine error still reports as a failure even when the signal is already aborted. Aborted events carry no `error_type`.

## Event fields

| Field | Description |
|---|---|
| `ai_index_id` | The id of the AI index the KI write targets. |
| `managed` | Whether the AI index is managed (registered from code). The field is optional and omitted when the managed state is unknown, which is the case on some failures. |
| `outcome` | The write outcome: `success`, `failure`, or `aborted` when the run was cancelled. |
| `error_type` | On failure, the error name (for example `AiIndexNotFoundError`) or the workflow `ExecutionError` type (for example `PermissionError`, `NotFoundError`, `ValidationError`); anything else reports as `unknown`. |

## Logs

- KI writes and write failures log at `debug` from the `plugins.contextEngine.context_steps` logger. Log lines carry the KI document id and the AI index id.

- Telemetry reporting failures log at `debug` from the `plugins.contextEngine.telemetry` logger.
