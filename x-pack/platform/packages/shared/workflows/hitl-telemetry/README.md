# `@kbn/workflows-hitl-telemetry`

Shared server-side package that provides a **dual-emit** telemetry helper for HITL (Human-in-the-Loop) workflow events. Every HITL state transition — form created, user responded, timed out — is emitted to two sinks simultaneously: the **Elastic Behavioral Telemetry** (EBT) pipeline and the **workflow event log** (structured `logger.debug`). Both emits are best-effort; a failure in one does not suppress the other.

## Exports

| Export | Description |
|---|---|
| `HITL_EVENT_TYPES` | `{ created: 'hitl.created', responded: 'hitl.responded', timedOut: 'hitl.timed_out' }` |
| `ResponseSource` | `'chat' \| 'inbox' \| 'unknown'` — identifies which surface submitted the response |
| `HitlEventContext` | `{ source_app, responseSource, execution_id, workflow_id?, step_execution_id?, response_latency_ms? }` |
| `reportHitlEvent(analytics?, logger?, event, context)` | Emits to EBT (`analytics.reportEvent`) and/or the event log (`logger.debug`); both parameters are optional |
| `HitlAnalytics` | Minimal interface: `{ reportEvent(type, data): void }` — satisfied by `AnalyticsServiceSetup` |
| `HitlLogger` | Minimal interface: `{ debug(msg, meta?): void }` — satisfied by `IWorkflowEventLogger` and `Logger` |

## Usage

```typescript
import { reportHitlEvent, HITL_EVENT_TYPES } from '@kbn/workflows-hitl-telemetry';

// Emits to both EBT and the event log when both are available
reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, {
  source_app: 'agent_builder',
  responseSource: 'chat',
  execution_id: executionId,
  step_execution_id: stepExecutionId,
  response_latency_ms: Date.now() - startedAt,
});
```

## Further reading

The HITL architecture — including where each event is emitted across Agent Builder, Inbox, and the Workflows execution engine — is documented in the [HITL deep-dive](/x-pack/platform/packages/shared/workflows/hitl-common/README.md), specifically the [`@kbn/workflows-hitl-telemetry` package section](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#kbnworkflows-hitl-telemetry).
