# Dispatcher

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The dispatcher is the action dispatch pipeline for alerting v2. It reads alert episodes from `.rule-events`, reads user/system action history from `.alert-actions`, decides what should dispatch now, dispatches eligible groups, and records the outcome back into `.alert-actions`.

It runs on its own Task Manager schedule, separate from per-rule execution.

## What the dispatcher owns

- Loading candidate alert episodes for the current execution window
- Applying suppression semantics from alert actions
- Matching episodes to action policies
- Grouping matched episodes
- Throttling repeated delivery
- Dispatching to destinations
- Recording the final decision set in `.alert-actions`

## What the dispatcher does not own

- Running ES|QL for rules
- Creating breach, recovery, or no-data events
- Calculating episode state transitions

Those responsibilities are intentionally upstream in the rule executor and director.

## Mental model

```text
Rule executor / director               Dispatcher
    writes episodes                    reads episodes + actions
           |                                   |
           v                                   v
     `.rule-events` ----------------> policy evaluation
           ^                                   |
           |                                   v
           +--------------------------- `.alert-actions`
                           durable suppression / throttle / outcome history
```

Signal events never enter this pipeline. The dispatcher only processes alert-type rule events that carry `episode.*` state.

### Episode identity: the subject

Episodes are keyed by a `subject`, computed identically in ES|QL (`SUBJECT_EVAL` in `queries.ts`) and in TypeScript (`episodeSubject` in `steps/utils/subject.ts`):

- internal episodes (`source` is `internal` or absent): `subject = rule_id`
- external episodes (any other `source`): `subject = ${space_id}::${source}`

The subject, not `group_hash`, is what makes a series unique. `group_hash` is only a grouping key — `buildGroupHash` hashes the grouping fields and their values, so the same hash occurs across rules and spaces. A rule id is a globally unique saved-object id and therefore implies a space; a vendor name does not, so the space is folded into external subjects to keep episode aggregation, throttling and suppression isolated per space.

## How one execution works

Each dispatcher run derives a bounded scan window from the persisted `eventWatermark`:

```
windowStart = eventWatermark − OVERLAP_WINDOW_MINUTES
windowEnd   = min(windowStart + MAX_WINDOW_MINUTES, startedAt − SETTLE_BUFFER_SECONDS)
```

The window caps **event** rows only. Action rows are not upper-bounded, so `last_fired` still sees records `StoreActionsStep` stamped with `now` (after the settle buffer).

`eventWatermark` is a **content-addressed** progress marker — it advances only after episodes in the window have received `.alert-actions` records, never based on wall-clock alone:

| Tick outcome                                    | `nextWatermark`                                     |
| ----------------------------------------------- | --------------------------------------------------- |
| Truncated (`EPISODE_QUERY_LIMIT` rows returned) | `last_event_timestamp` of the last returned episode |
| `no_episodes` or `no_actions` halt              | `windowEnd`                                         |
| Aborted before `StoreActionsStep`               | `eventWatermark` (no advance)                       |
| Normal completion                               | `windowEnd`                                         |

`nextWatermark` never regresses: the final value is `max(computed, eventWatermark)`.

Cold start (no persisted watermark) is logged as `DISPATCHER_COLD_START` and the watermark is seeded to `startedAt − OVERLAP_WINDOW_MINUTES`.

The scan window, persisted action history, and content-addressed dedup let the dispatcher decide which episodes are new or still relevant without blindly replaying everything on every run.

The pipeline then moves through these phases:

1. Wait for plugin resources to be ready
2. Fetch candidate episodes (keys-only scan — no `data` payload)
3. Fetch suppression facts
4. Split into dispatchable vs suppressed episodes
5. Hydrate `data` payload for dispatchable episodes only
6. Load rule metadata for dispatchable episodes
7. Load enabled action policies
8. Evaluate policy matchers
9. Build action groups
10. Apply throttling
11. Dispatch eligible groups
12. Store final actions and reasons

### Decision outcomes written to `.alert-actions`

By the end of a dispatcher run, every episode that reached the later pipeline stages falls into one of these buckets:

| Outcome      | What happened                                                                                              | Action documents written                             |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `dispatch`   | The episode matched a policy, survived suppression and throttling, and was selected for delivery.          | `fire` per episode, plus `notified` per action group |
| `throttled`  | The episode matched a policy, but the action group was held back by throttling.                            | `suppress` with a throttle-related reason            |
| `suppressed` | The episode was explicitly filtered out by suppression logic such as ack, snooze, or deactivate semantics. | `suppress` with the suppression reason               |
| `unmatched`  | The episode remained dispatchable but matched no enabled action policy.                                    | `unmatched`                                          |

The full action taxonomy, including user-written actions such as `ack` and `snooze`, is documented in [`../../resources/README.md`](../../resources/README.md).

## Architecture

The dispatcher combines:

- a Task Manager boundary (`DispatcherTaskRunner`)
- a service boundary (`DispatcherService`)
- a sequential pipeline (`DispatcherPipeline`)
- explicit step contracts (`DispatcherStep`)

```text
Task Manager
   |
   v
DispatcherTaskRunner
   |
   v
DispatcherService
   |
   v
DispatcherPipeline
   |
   +--> WaitForResourcesStep
   +--> FetchEpisodesStep           (keys-only scan)
   +--> FetchSuppressionsStep
   +--> ApplySuppressionStep
   +--> HydrateEpisodeDataStep      (lazy data fetch for survivors)
   +--> FetchRulesStep
   +--> ApplyMaintenanceWindowStep
   +--> FetchPoliciesStep
   +--> EvaluateMatchersStep
   +--> BuildGroupsStep
   +--> ApplyThrottlingStep
   +--> DispatchStep
   +--> StoreActionsStep
   +--> StoreExecutionHistoryStep
```

Unlike the rule executor, the dispatcher is not streaming. Each step receives one immutable-looking state snapshot and returns either:

- `continue` with a partial state merge, or
- `halt` with a `DispatcherHaltReason`

## Action policy model

An action policy is a saved object scoped to a Kibana space. Policies are not embedded into the rule. Instead, the dispatcher loads enabled policies for the space and evaluates each policy against the candidate episodes.

Each policy defines:

- `matcher`: optional KQL filter evaluated against the episode context and `data.*`
- `groupBy` and `groupingMode`: how matched episodes are batched
- `throttle`: when repeated actions are allowed
- `destinations`: where matching groups should go
- `snoozedUntil`: optional time-based suppression
- `apiKey`: optional credential used to dispatch

An empty matcher is a catch-all.

## Operational parameters

| Parameter                   | Value                          | Source                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task schedule               | `5s`                           | [`schedule_task.ts`](schedule_task.ts)                                                                                                                                                                                                  |
| Task timeout                | `1m`                           | `DISPATCHER_TASK_TIMEOUT` in [`constants.ts`](constants.ts)                                                                                                                                                                             |
| Soft deadline               | `42 000 ms` (~70 % of timeout) | `TICK_DEADLINE_MS` — pipeline is aborted at this point so the returned `RunResult` is always within the TM window                                                                                                                       |
| Episode query cap           | `10 000` rows                  | `EPISODE_QUERY_LIMIT` in [`queries.ts`](queries.ts) — a truncated tick advances the watermark to the last returned row, not to `now`                                                                                                    |
| Overlap re-read             | `10` minutes                   | `OVERLAP_WINDOW_MINUTES` — each scan re-reads this far behind the watermark; content-addressed dedup makes re-reads free                                                                                                                |
| Max scan window             | `15` minutes                   | `MAX_WINDOW_MINUTES` — caps forward progress per tick; must be `> OVERLAP_WINDOW_MINUTES`                                                                                                                                               |
| Settle buffer               | `5` seconds                    | `SETTLE_BUFFER_SECONDS` — excludes the most recent slice to avoid scanning mid-write                                                                                                                                                    |
| Stuck-tick limit            | `10` ticks (~50 s)             | `STUCK_TICK_LIMIT` — after this many stuck ticks the escape hatch fires                                                                                                                                                                 |
| Pre-fetch force-advance lag | `15` minutes                   | `PRE_FETCH_STUCK_ADVANCE_LAG_MS` — if the hatch fires with no known episodes and lag exceeds this, skip the unread window                                                                                                               |
| Dispatch chunk size         | `250` items                    | `DISPATCH_CHUNK_SIZE` — max items per `bulkScheduleWorkflow` call. Workflows are prefetched with `getWorkflowsByIds` (one call per space) and scheduled in chunks batched by policy API key. The tick signal is checked between chunks. |
| Matcher language            | KQL                            | `@kbn/eval-kql`                                                                                                                                                                                                                         |

## Important pipeline state

The dispatcher carries state forward through `DispatcherPipelineState` in `types.ts`. Most fields are value objects (classes under `state/`) that name a pipeline concept and carry the behavior that belongs to it.

| Field              | Type               | Produced by                                                                        | Meaning                                                                                                                                                        |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`            | plain object       | Pipeline                                                                            | Window anchors (`eventWatermark`, `windowStart`, `windowEnd`) and execution context.                                                                            |
| `scan`             | `EpisodeScan`      | `FetchEpisodesStep`                                                                 | Candidate episodes fetched within `[windowStart, windowEnd]` plus the truncation flag; `truncationEdge()` is the watermark target on a truncated tick.          |
| `suppressions`     | `SuppressionIndex` | `FetchSuppressionsStep`                                                             | Suppression facts from `.alert-actions`, indexed for per-episode reason lookup.                                                                                 |
| `triage`           | `EpisodeTriage`    | `ApplySuppressionStep`; enriched by `HydrateEpisodeDataStep` (`mapDispatchable`), re-partitioned by `ApplyMaintenanceWindowStep` (`suppressDispatchableWhere`) | The evolving verdict: episodes that may still notify (`dispatchable`) vs those that must not (`suppressed`, with reasons).                                      |
| `rules`            | `RuleCatalog`      | `FetchRulesStep`                                                                    | Rule metadata keyed by rule id; owns the orphaned-internal-episode guard.                                                                                       |
| `policies`         | `PolicyCatalog`    | `FetchPoliciesStep`                                                                 | Enabled action policies keyed by id and grouped by space.                                                                                                       |
| `matched`          | plain array        | `EvaluateMatchersStep`                                                              | Concrete `(episode, policy)` matches.                                                                                                                          |
| `groups`           | plain array        | `BuildGroupsStep`                                                                   | Action groups to consider for delivery (transient — consumed by `ApplyThrottlingStep`).                                                                        |
| `plan`             | `DispatchPlan`     | `ApplyThrottlingStep`                                                               | Delivery decision: `toDispatch` vs `throttled`, plus the `unmatched` episodes that landed in no group.                                            |
| `outcome`          | `DispatchOutcome`  | `DispatchStep`                                                                      | What happened: workflow execution ids per group and failed (group, destination) attempts; `deliveredDestinationsFor()` filters totally-failed groups.           |
| `recordedEpisodes` | plain number       | `StoreActionsStep`                                                                  | Count of episodes that received an `.alert-actions` record this tick.                                                                                          |

## Execution steps

Step order is defined in `setup/bind_dispatcher_executor.ts`.

| #   | Step                         | Responsibility                                                                                   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `WaitForResourcesStep`       | Block the run until the dispatcher's required plugin resources are ready.                        |
| 2   | `FetchEpisodesStep`          | Load episodes via a keys-only scan (no `_source`/`data` payload). Halts on empty result.         |
| 3   | `FetchSuppressionsStep`      | Load alert-action facts needed for suppression decisions.                                        |
| 4   | `ApplySuppressionStep`       | Mark each episode as dispatchable or suppressed, preserving reasons.                             |
| 5   | `HydrateEpisodeDataStep`     | Fetch `data` payloads for the surviving dispatchable episodes only, via `getEpisodeDataQueries`. |
| 6   | `FetchRulesStep`             | Load rule metadata for the remaining dispatchable set.                                           |
| 7   | `ApplyMaintenanceWindowStep` | Suppress episodes whose timestamp falls within an active maintenance window in the same space.   |
| 8   | `FetchPoliciesStep`          | Load enabled action policies for the space.                                                      |
| 9   | `EvaluateMatchersStep`       | Evaluate each policy matcher against each episode context.                                       |
| 10  | `BuildGroupsStep`            | Build `ActionGroup` objects based on policy grouping settings.                                   |
| 11  | `ApplyThrottlingStep`        | Compare candidate groups with action history and split them into dispatch vs throttled.          |
| 12  | `DispatchStep`               | Perform delivery side effects for eligible groups.                                               |
| 13  | `StoreActionsStep`           | Persist the execution outcome to `.alert-actions`.                                               |
| 14  | `StoreExecutionHistoryStep`  | Emit per-policy `dispatched` / `throttled` / `unmatched` / `dispatch_failed` event-log summaries. |

## Halt reasons

| Reason        | Meaning                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no_episodes` | Nothing relevant was found for this run; watermark advances to `windowEnd`.                                                                                      |
| `no_actions`  | The run produced no stored outcomes after evaluation; watermark advances to `windowEnd`.                                                                         |
| `aborted`     | The pipeline was stopped early by the TM signal or the soft deadline (`TICK_DEADLINE_MS`). If aborted before `StoreActionsStep`, the watermark does not advance. |

## Watermark contract

The invariant maintained across all ticks:

> `scanLowerBound ≤ min(@timestamp of any rule-event not yet marked in .alert-actions)`

`eventWatermark` is written to Task Manager state only via the returned `RunResult`. If the TM timeout elapses before `run()` returns, TM discards the state write entirely — the watermark freezes. The soft deadline (`TICK_DEADLINE_MS ≈ 70 % of task timeout`) ensures the pipeline always stops and returns a safe `RunResult` well within the TM window.

### Stuck-watermark escape hatch

If the watermark does not advance for `STUCK_TICK_LIMIT` consecutive ticks (default 10, ~50 s), the dispatcher:

1. Logs `DISPATCHER_WATERMARK_STUCK` at error level.
2. Force-records all blocking episodes as `unmatched` in `.alert-actions` so the content-addressed dedup mark advances past them.
3. Advances `nextWatermark` to `input.windowEnd`.
4. Resets the stuck-tick counter to 0.

The blocking episodes are **not dispatched** — they are permanently marked as `unmatched`. This is the documented escape from a permanently un-recordable episode that would otherwise stall the dispatcher indefinitely.

If the pipeline never reached `FetchEpisodesStep` (`episodes` empty), there is nothing to mark. While watermark lag is within `PRE_FETCH_STUCK_ADVANCE_LAG_MS` (one max scan window), the hatch holds the watermark, logs `DISPATCHER_ESCAPE_HATCH_PRE_FETCH_STUCK`, and resets the counter so a transient outage can recover. Once lag exceeds that threshold, it logs `DISPATCHER_ESCAPE_HATCH_PRE_FETCH_FORCED_ADVANCE` and advances to `windowEnd` anyway — unread events in that window are skipped so the dispatcher cannot stall forever.

## Delivery guarantees and limits

- Delivery is effectively at-least-once. If delivery succeeds but action recording fails or the process crashes, a later run may re-deliver.
- Destination handlers should therefore be idempotent.
- Workflow destinations are scheduled in `DISPATCH_CHUNK_SIZE` (250) batches via `bulkScheduleWorkflow`, not per-group `pLimit(3)`.
- The episode query is capped at `EPISODE_QUERY_LIMIT` (10 000) rows per run. A truncated tick advances the watermark only to the last returned row's timestamp; the deferred tail is scanned next tick.
- Sustained backlog is drained over multiple ticks at up to `MAX_WINDOW_MINUTES − OVERLAP_WINDOW_MINUTES` minutes per tick.
- Per-tick observability is emitted at `debug` level: `halt_reason`, `watermark_lag_ms`, `window_span_ms`, `truncated`, `episode_count`, `stuck_ticks`.

## When to add a new dispatcher step

Add a step when you need a new distinct phase in the action dispatch pipeline, especially when that phase:

- introduces new pipeline state
- must run in a specific order relative to suppression, grouping, or dispatch
- is reusable and understandable as a standalone responsibility

Do **not** add a step when:

- you only need a small change to an existing step's local behavior
- the change really belongs in the rule executor or director
- the change is only a new destination type within `DispatchStep`

## Creating a new dispatcher step

### Step 1: Create the step class

```typescript
import { injectable } from 'inversify';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

@injectable()
export class MyNewStep implements DispatcherStep {
  public readonly name = 'my_new_step';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    // Every state VO has an `empty()` null object, so steps never null-check state fields.
    const { scan = EpisodeScan.empty() } = state;
    if (scan.isEmpty()) {
      this.logger.debug({ message: `[${this.name}] No episodes available` });
      return { type: 'continue' };
    }

    const myResult = await this.doSomething(scan.episodes);

    return {
      type: 'continue',
      data: { myNewMetadata: myResult },
    };
  }

  private async doSomething(_episodes: readonly AlertEpisode[]): Promise<string> {
    return 'ok';
  }
}
```

The pipeline hands each step a logger already labelled with the step name and the tick's `task_id`, so keep messages static and put anything variable in labels instead.

### Step 2: Extend pipeline state if needed

If the step produces new state, add a field to `DispatcherPipelineState` in `types.ts`. Prefer a value object (a class under `state/` with a private constructor and static factories, like `EpisodeScan` or `DispatchPlan`) when the new state groups related data or carries behavior; a plain field is fine for a single scalar or pass-through array:

```typescript
export interface DispatcherPipelineState {
  readonly input: DispatcherPipelineInput;
  readonly scan?: EpisodeScan;
  readonly suppressions?: SuppressionIndex;
  readonly triage?: EpisodeTriage;
  readonly rules?: RuleCatalog;
  readonly policies?: PolicyCatalog;
  readonly matched?: MatchedPair[];
  readonly groups?: ActionGroup[];
  readonly plan?: DispatchPlan;
  readonly outcome?: DispatchOutcome;
  readonly myNewMetadata?: string;
}
```

### Step 3: Export and bind in order

Export the step from `steps/index.ts`, then register it in `setup/bind_dispatcher_executor.ts` where it should execute.

```typescript
import { MyNewStep } from '../lib/dispatcher/steps';

bind(DispatcherExecutionStepsToken).to(FetchEpisodesStep).inSingletonScope();
bind(DispatcherExecutionStepsToken).to(MyNewStep).inSingletonScope();
bind(DispatcherExecutionStepsToken).to(FetchSuppressionsStep).inSingletonScope();
```

Binding order is execution order.

### Step 4: Add focused tests

```typescript
import { MyNewStep } from './my_new_step';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';

describe('MyNewStep', () => {
  it('adds state when episodes exist', async () => {
    const step = new MyNewStep();

    const result = await step.execute(
      createDispatcherPipelineState({
        episodes: [createAlertEpisode({ rule_id: 'rule-1' })],
      }),
      createStepLogger()
    );

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data).toMatchObject({ myNewMetadata: 'ok' });
  });
});
```

To assert on log output, pass `createLoggerService().loggerService` instead and inspect its `mockLogger`.

## Adding a new destination type

If you are not adding a new pipeline phase, but instead want to support a new delivery target, start with:

- `types.ts` to extend `ActionPolicyDestination`
- `steps/dispatch_step.ts` to add the new dispatch branch
- any saved object / route validation that defines allowed destinations

Current production delivery is workflow-based. `DispatchStep` uses the policy API key to craft a fake request, prefetches workflows with `getWorkflowsByIds`, and schedules them through `bulkScheduleWorkflow` on the workflows management plugin.

## Testing

Useful coverage points:

- `steps/*.test.ts` for step-local behavior
- `execution_pipeline.test.ts` for ordering and halt semantics
- `dispatcher.test.ts` for service-level behavior
- `queries.test.ts` for ES|QL generation
- `integration_tests/dispatcher.test.ts` for end-to-end dispatcher behavior

## Safe contribution guidelines

- Keep side effects concentrated in `DispatchStep`. Earlier steps should mostly classify and shape data.
- Do not mutate existing state objects in place; return new partial state instead.
- If you add new action semantics, verify both the query side (`queries.ts`) and the write side (`StoreActionsStep`).
- If you change grouping or throttling identity, treat it as a behavioral change that needs explicit tests because it affects future deduplication.
