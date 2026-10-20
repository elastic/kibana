# Track 7 capability kit — 0.1.4 pre-release research slice

PRIVATE research code; no public Core API, plugin lifecycle hook, or automatic enablement.
Base harness fd3138c. Only main owns TM claims/leases/results.
Default one async run per slot; configure concurrencyPerClass: { action: 50 } on
ExecutionHost for I/O-bound classes. This is async interleaving, NOT parallel JS
within an isolate. Each run pins its own bundle/registry/signal/pending RPC.
Cooperative cancellation affects only its run. A non-cooperative hard stop kills
the whole slot: EVERY co-resident outcome is terminated, with collateral flag,
initiatingRunId and all discardedRunIds (when multiple runs are lost). Slot crash
also reports discarded IDs. Queue/admission/lease policy still belongs to TM.
This is the minimal runner integration surface, NOT the complete 7.P acceptance.

## Host (main)

Import `ExecutionHost`, `ModuleRegistry`, `bindSavedObjects`, `bindTaskManager`,
`bindLogger` from this directory's `index.ts` (research-relative entry; no package subpaths).
Set `KBN_RESEARCH_CAPABILITY_KIT=true` **before Core client construction**.
Core-internal `captureResearchEsCapability` is exported only from
`@kbn/core-elasticsearch-client-server-internal`, not public Core.

```ts
const specifier = require.resolve('./my_runner_entry');
const registry = new ModuleRegistry(new Set([specifier]));
registry.register('workflow:run', specifier, 'execute');
const host = new ExecutionHost(registry, { transport: 'thread', slotsPerClass: 1 });
const outcome = await host.run({
  workloadClass: 'workflow', moduleId: 'workflow:run',
  input: { taskId }, principal: authenticatedPrincipalId, space: spaceId,
  deadlineMs: 30_000, signal: taskAbortSignal,
  data: {
    elasticsearch: captureResearchEsCapability(
      core.elasticsearch.client, taskFakeRequest, 'current', { projectRouting: 'space' }
    ),
  },
  capabilities: {
    savedObjects: bindSavedObjects(alreadyScopedSoClient, {
      principal: authenticatedPrincipalId, space: spaceId,
    }),
    taskManager: bindTaskManager(taskManager),
    logger: bindLogger(logger),
  },
});
// Exhaustively handle success / failure / terminated; terminated is NEVER success.
await host.stop();
```

Credentials are memory-only. Never log/persist bundle, data, request headers or capture.
Do not grant internal ES authority by default. The current-user capture strips unused
internal username/password/service token and TLS identity (unless Core deliberately
always presents it). Header arrays preserved; UIAM resolution occurs in Core before
crossing, including task external-credential markers and session provider precedence.
An unrecognized CPS factory fails closed rather than guessing its policy.

## Isolate module

```ts
import { createRunServices } from './capability_kit';
import type { TaskEntry } from './capability_kit';

export const execute: TaskEntry = async (input, context) => {
  const services = createRunServices(context);
  try {
    // services.elasticsearch is the LOCAL Core ES client. Large responses stay here.
    // services.savedObjects is an explicit MAIN bridge retaining real scoped wrappers.
    // services.taskManager exposes schedule/fetch/runSoon on main.
    // services.logger buffers <=100 bounded messages, flushed on close.
    return { completed: true };
  } finally {
    await services.close();
  }
};
```

Await every capability call before returning. Background callbacks are not supported.
No Core request object or closure is cloned. Schemas/contributed callbacks load locally
via `context.load(id)` from module registrations; arbitrary functions/getters/classes
are rejected by the data codec. Supported values: plain data, Buffer/Uint8Array,
ArrayBuffer (decoded as Buffer), Date, BigInt, ByteSizeValue, moment Duration
(calendar months/days retained via ISO), and typed errors.0.1.4 reconstructs actual
ServerSentEventError (AgentBuilderError alias; guards/code/meta/toJSON preserved),
Boom (status/output/headers/data), and11SO helper classifications (private symbol
identity rebuilt by owner factory). Name/message/stack/cause chains retained.
Plain Error retains string code/numeric statusCode. Arbitrary custom Error
subclasses are not magically reconstructed; unknown wire codec tags fail closed.
No raw error payloads go into crossing telemetry.

## Mutable registries / semantics

Each dispatch carries one monotonic FULL snapshot (not a start-only replica). A run
pins that snapshot; additions/removals/replacements affect subsequent dispatches.
No half-applied delta protocol. A removed entry fails rather than falling back.
Only statically allowlisted specifiers load. Replacing an ID with a DIFFERENT static
export/specifier works. Replacing executable file contents under the SAME specifier
requires pool restart (Node caches modules); do not call revision a code hot-reloader.

Thread and child-process adapters use the same protocol. Main never Atomics-waits;
rare worker-to-main sync API is not yet implemented. Deadlines include queue
and bootstrap. In0.1.1, cancellation/deadline/shutdown FIRST send a cancel packet:
WorkerContext.signal aborts with AbortError (TimeoutError for deadline), then sends
an acknowledgement. Task code can perform bounded terminal persistence and return.
Host abortGraceMs (per-host or per-run, default250ms, allowed0–30000ms) bounds this
grace, then hard-stops and awaits actual exit. Grace is ADDITIONAL to deadlineMs;
set0 for immediate hard kill. A cancelled task NEVER becomes success: its outcome
is terminated; graceful=true proves abort acknowledgement preceded outcome,
and terminal carries the task's terminal value/error. Main may race an already
finishing task: graceful=false then honestly records no abort acknowledgement.
Queued/pre-aborted work terminates without invoking task code. Other class slots survive.
Late host replies are fenced by run ID + slot identity. Other class slots survive.

SO supports get/resolve/create/update/delete/find (single type). Namespace/namespaces/
spaceId overrides are denied; pass a genuine Core space-scoped security-wrapped
client, not an unwrapped internal repository. Principal/space must match its binding.
This bridge preserves actual migration/security/ESO behavior ON MAIN; no claim of
worker-local SO/ESO, large-state isolation or RBAC proof from fixture clients.

## Acknowledged event streams (0.1.3)

Main: bindBatchStream(async(batch, bundle) => { await consume(batch.events); }).
Grant it as capability events. Worker: const stream = createBatchStream(context,
'events'); await stream.write(events); ... await stream.close(). Both transports
share ordered sequence+RPC correlation; ACK comes ONLY after the consumer settles.
Task must await every write/close before returning. Default bounds:64events,
64KiB encoded payload/batch,2pending batches/writer,4stream IDs/run (including
terminal tombstones). Configure BatchLimits at BOTH ends; host limits win.
Over-limit fire-and-forget writers reject explicitly; awaiting writes supplies
backpressure. No silent drops/reordering or unbounded queue. Consumer errors poison
the stream; later writes fail. Host cleans all stream state at run end. This is
not crash-persistent/exactly-once delivery: consumers own idempotency; no retransmit.
Cooperative cancellation may flush bounded terminal events during abortGraceMs.

## Adoption instrumentation

Optional `onCrossing(entry)`: metadata only (run ID, direction, edge, lever, generic,
V8-encoded byte count, handler ms). Lever labels match the7.0 atlas EXACTLY
(LEVER_LABELS maps concise binding aliases to catalogue labels). No payload, principal, space, config or headers.
Absent callback avoids measurement serialization; callback errors cannot fail a run.
Use explicit catalogue lever per binding. Count calls from isolate_to_host request
entries (do not count reply as another dependency call); unique edges = edge set.
Host run/outcome control traffic is separate, not an adoption denominator.
These are observed boundary calls only: unique-edge adoption must JOIN the original
atlas, retaining co-located/eliminated/unobserved candidates, not count crossings
alone as the denominator.
Transport bytes are application serialization estimates, not kernel framing.

## Validation / limits

`node .../server/capability_kit/kit_probe.cts` runs real thread/process native tests.
Core Jest `research_capability.test.ts` tests exact Core auth/UIAM resolution.
Controlled HTTP fixture checks actual Core transport headers/CPS/opaqueId/output,
including401 after fixture revocation; not live ES security or actual UIAM server.
No stack/QAF, real runner, cgroup/pod fit, exact slices or scored latency claim.

Outstanding 7.P: worker-local composed real SO/ESO + readiness/auth/audit parity;
scoped live SO security matrix; session refresh bridge (capture is a per-run snapshot,
not token renewal); rare sync lane; telemetry overhead and per-MB/call measurement;
distribution-shaped initialized-service floor; bounded envelope sizes/backpressure;
broader SO operations, additional custom error codecs, logger metadata and production bootstrap.

0.1.4 also repairs two Grok findings on0.1: actual Core start client facade now
aliases its concrete client's private capture; waiting-run timeout retires a
never-ready bootstrap when no waiters remain, allowing class recovery.
Stopping execution does not roll back already-admitted host/ES writes. Framework
callers remain responsible for idempotency and authoritative TM persistence.
