# Track 7 capability kit — 0.1.12 pre-release research slice

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

## 0.1.11 trust domain and co-residency (credential negatives)

Per-run random grants stop confused-deputy BUGS. Tested fail-closed on both transports: an
ungranted capability, a fabricated grant, an SO bridge bound to another principal or space,
and namespace overrides. Live ES (t7p-live-task-auth-002): foreign index 403; API key
revoked by the host mid-run gives 401 on the next local ES call.
NEGATIVE FINDING: one isolate is ONE trust domain. With `concurrencyPerClass > 1`, a
co-resident run can listen on the shared worker port/IPC. It sees another run's `run`
packet, including its grants and `data` capture (ES credentials), and can invoke that run's
capabilities AS that run. This is demonstrated in credential_negatives.node_test.ts. Grants
are not a security boundary between co-resident code. Kibana plugin code is trusted
in-process today; the kit isolates failure and blocking, not hostile code.
Mitigation: `new ExecutionHost(registry, { coResidency: 'same-principal' })` co-locates
only runs with identical principal AND space. Different identities get different slots
(head-of-line FIFO per class), so they never share an isolate. The test proves 0
exposure. Cost: up to one slot per concurrent identity per class. Default stays 'any'
for 0.1.x compatibility. Recommended for multi-user classes (workflows, Agent Builder).
Session tokens are NOT refreshed (capture is per-run); long runs need API-key/UIAM
task credentials, or they fail closed with 401 when the token expires.

## 0.1.10 generic service binder (replaces hand-written runner facades)

7.W and 7.A each hand-write request-scoped allowlist facades: Spaces, security
privileges, maintenance windows, Actions, TM, the workflow original-request
profile/audit clients, and positional loggers. Those count as BESPOKE. Use the
unmodified kit binder instead:

```ts
// MAIN, per run: resolve request-scoped clients HERE (original/fake request never crosses).
const actions = await actionsPlugin.getActionsClientWithRequest(originalRequest);
capabilities: {
  actions: bindService(actions, { operations: ['get', 'getAll', 'execute'],
    signal: { operations: ['execute'] } }),          // injects the run's main-side signal
  logger: bindService(logger, { operations: ['info', 'warn', 'error'],
    positional: true, ordered: true, discardResult: true }),
}
// WORKER
const call = createServiceCaller(context, 'actions');
await call('execute', { actionId, params });
const log = createServiceCaller(context, 'logger', { positional: true });
void log('info', 'message', { meta });              // FIFO on main
```

Semantics: an explicit method allowlist (fails closed, and rejects non-methods). Methods run
with their real receiver on main, so #private fields work. Args/results use the kit codecs;
results that aren't data fail the call, so use async handles for objects. `positional`
spreads an argument array. `ordered` gives FIFO per run. `signal` injects
`HostCallContext.signal` into the last object argument (or appends `{signal}`). That signal
aborts when the run ENDS (outcome or hard stop), with reason Timeout/Abort or the caller's
original reason. It does NOT abort at the start of cooperative grace, so terminal-persistence
calls during grace still work. Default lever: generic `capability_bundle`. A binder over a
run-scoped service needs no owner change. Runner-specific argument rewriting stays bespoke
and must be labelled that way.

## 0.1.9 runner fixes (additive; 0.1.8 call sites unchanged)

- **Long deadlines (P0 fix).** Node clamps setTimeout delays above 2^31-1 ms (~24.8 days)
  to 1 ms. Before 0.1.9 a `deadlineMs` of 365 days fired a DEADLINE after 1 ms; under
  `@kbn/setup-node-env` (dev) the TimeoutOverflowWarning exits the WHOLE process.
  Deadlines are now re-armed in chunks; accepted range 1..Number.MAX_SAFE_INTEGER ms.
- **Stall watchdog (opt-in).** `RunOptions.stallMs` (100..3600000) is separate from
  `deadlineMs` (the wall-clock/TM timeout). The worker sends an event-loop heartbeat every
  clamp(stallMs/4, 25, 1000) ms. Any packet counts as progress. If the slot is silent for
  stallMs, the run gets cooperative abort, reason `'stall'` (worker sees a TimeoutError
  DOMException), then grace, then a hard stop. Outcome: `{ status: 'terminated',
  reason: 'stall' }`. Co-resident runs on that slot are collateral, as with any hard stop.
  This detects a blocked isolate event loop. It does NOT detect application no-progress
  (for example an awaited remote hang); keep using deadlines and app heartbeats for that.
  `'stall'` only appears when the caller opted in.
  0.1.12 fixes two false positives found in 0.1.9:
  (a) The watchdog now arms when the worker reports the task module LOADED (`started`
  packet). Synchronous cold module loading (hundreds of ms under dev SWC) used to be
  killed as a stall when stallMs was small. Bootstrap and loading stay under the deadline.
  (b) If MAIN itself was blocked (the check ran late by more than stallMs/2), the window is
  re-baselined. Queued worker heartbeats can't have been received yet, so the silence
  proves nothing about the worker.
  Use stallMs well above your largest legitimate synchronous slice.
- **Abort reason.** If the host `signal` aborts with a codec-safe reason (for example
  `controller.abort({ source: 'api', actor })` or an Error), the worker
  `context.signal.reason` is the decoded original value. The default AbortError, or a
  reason the codec can't encode, keeps the categorical DOMException (previous behaviour).
  `context.cancellation?.()` returns `{ reason: 'cancelled'|'deadline'|'shutdown'|'stall',
  hasOriginalReason }` so runners can tell a TM/API cancel from host shutdown or a deadline.
  The shutdown DOMException message is now 'Execution host shutdown'.
- **ES client errors.** `ResponseError`, `TimeoutError`, `ConnectionError`,
  `NoLivingConnectionsError` and `RequestAbortedError` are rebuilt from the receiving
  isolate's own `@elastic/elasticsearch`. So `instanceof`, `statusCode`, `body`, `meta`,
  `isRetryableEsClientError` and 429/503 retry guards behave the same on both sides.
  The diagnostic keeps body, statusCode, warnings, attempts, aborted, request
  method/path/id, plus allowlisted response headers (retry-after, content-type,
  warning, x-elastic-*, x-opaque-id, trace-id, x-found-*). Request headers/body/
  querystring, the connection URL, context and set-cookie NEVER cross.
- **Callback results.** A worker callback that returns an unencodable value now fails
  only that callback call ('Callback result is not transportable'). Before 0.1.9 it
  exited the slot, killing co-resident runs.
- **Ordered bindings.** `Binding.ordered = true` runs that capability's calls for one run
  strictly FIFO (each starts after the previous settles; a failure doesn't block later
  calls). Use it for fire-and-forget audit/logger/event side effects whose order matters.
  Default bindings may still complete out of order.

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
Buffer, ArrayBuffer, typed arrays (incl BigInt), DataView, Map, Set, RegExp
(flags/lastIndex), URL/URLSearchParams, nonfinite numbers/-0, Date, BigInt,
ByteSizeValue, moment Duration
(calendar months/days retained via ISO), and typed errors.0.1.4 reconstructs actual
ServerSentEventError (AgentBuilderError alias; guards/code/meta/toJSON preserved),
Boom (status/output/headers/data), and11SO helper classifications (private symbol
identity rebuilt by owner factory). Name/message/stack/cause chains retained.
Plain Error retains string code/numeric statusCode. Arbitrary custom Error
subclasses are not magically reconstructed; unknown wire codec tags fail closed.
No raw error payloads go into crossing telemetry. Typed views copy ONLY visible
bytes (no pooled-buffer disclosure), reconstruct at byteOffset0; backing-buffer
aliasing/repeated object identity are not retained by data codecs. WeakMap/WeakSet
and cycles fail closed; functions/services use explicit handles or module code.

## Mutable registries / semantics

Each dispatch carries one monotonic FULL snapshot (not a start-only replica). A run
pins that snapshot; additions/removals/replacements affect subsequent dispatches.
No half-applied delta protocol. A removed entry fails rather than falling back.
Only statically allowlisted specifiers load. Replacing an ID with a DIFFERENT static
export/specifier works. Replacing executable file contents under the SAME specifier
requires pool restart (Node caches modules); do not call revision a code hot-reloader.

Thread and child-process adapters use the same protocol. Main never Atomics-waits;
bounded worker-to-main sync API is documented below. Deadlines include queue
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
This bridge preserves actual migration/security/ESO behavior ON MAIN. Optional
local SO/ESO is explicit below; main bridge still needed for scoped RBAC until a
real security/audit extension is supplied. No RBAC proof from fixture clients.

## Worker-local SO/ESO (0.1.8 research frontier)

Register a module export SoRegistration {revision,types,encryptedTypes}; factories
and model-version functions load locally, never cloned. Register a private ESO
factory module (research_eso_bootstrap.ts in ESO, copied from T1 pushed5f31987,
then extended with currentUser injection; no public ESO contract change).
Mint bundle.data.savedObjectsLocal: LocalSoCapability {principal,space,mode,
index,kibanaVersion,registryId,registryRevision,esoFactoryId,encryptionKey,
decryptionOnlyKeys,includedHiddenTypes,migrationReady}. Credentials/keys MEMORY
ONLY. index is the DEFAULT BASE name: real Core resolves per-type VERSION aliases.
Main must advertise readiness ONLY after actual Core startup migrations/aliases;
this factory NEVER runs startup migrations. Revision mismatch/no readiness denies.
Worker: await createLocalSavedObjects(context,localEsClient,logger[,securityExtension]).
Methods get/resolve/bulkGet/find(type,opts)/create/update/delete are namespace-pinned;
namespace/namespaces/spaceId overrides deny. Real repository+DocumentMigrator+
encryption extension run locally. Partial ESO update of encrypted/AAD attrs denies.
getDecryptedAsInternalUser is INTERNAL-only, uses a real repository read/migration
without stripping then actual ESO decrypt. Included hidden types and namespace
checks remain owner repository behavior, not manual raw-index shortcuts.
SCOPED mode FAILS CLOSED unless passed the REAL local security/audit extension;
no RBAC stub or synthetic identity. Existing scoped MAIN bridge remains fallback.
No initialized scoped RBAC/audit parity proof yet. Rich contributed model-version
registrations still require owner module factories, not copied function closures.

Live t7p-composed-so-eso-001: actual secure ES, main/thread/child identical fixture
migration-on-read, at-rest secret stripping/decrypt, safe partial update, foreign
namespace/AAD-update denial; missing readiness/principal/revision/scoped extension
deny. ONE initialized fixture type, not real runner/185-type registry or pod fit.
Source/dev post-GC service floor about89–94MiB heap (not distribution/PC); thread
RSS is WHOLE process, never per-worker. Main owns startup/indices; no second poller.

## Rare thread→main sync (0.1.6)

Grant bindSyncOperations({ lookup: (args,bundle)=>value }); worker calls
context.callSync(capability,'lookup',args,{timeoutMs:50,maxReplyBytes:65536}).
ONLY worker Atomics.waits. Main executes a STATIC allowlist without awaiting;
operations MUST be pure, bounded CPU, no I/O/mutation/worker calls. Prefer a local
replica/static snapshot. Max8calls/run,64KiB encoded request/reply, timeout1–1000ms,
reply capacity256–65536bytes. Timeout fails closed; each call owns fresh SABs so
late replies cannot corrupt a later call. This blocks the WHOLE worker isolate,
including co-resident async runs, not just the calling task. Main CPU/time measured.
Child processes explicitly reject callSync (no SAB across IPC); use context.call
against the SAME binding asynchronously or a static snapshot. No FIFO sync claim.

## Residual async service handles (0.1.5)

Main grants handles: bindAsyncServices({ serviceObject, registryFunction },
{ staticMetadata: ... }). Worker uses createAsyncServiceClient(context,'handles'):
await roots() -> services handle references + COPIED static snapshots;
await get(ref,key), await invoke(methodRef,args), await snapshot(ref,keys),
await release(ref). There is NO implicit JavaScript Proxy and no main sync wait.
Class private-field receivers are owner-side; handing a host ref back unwraps to
its actual object. Object results are handles (not eager graph snapshots); use
snapshot(ref,keys) for bounded data, or prefer module-specifier local code.
For callbacks: context.exportCallback(async (...args)=>...), pass that reference
as a service argument; main receives an async callback. Returning it to its owning
worker unwraps to the ORIGINAL function. context.releaseCallback(ref) revokes it.
Limits256host handles/run and256worker callbacks/pending callback calls; explicit
release or run-end cleanup, no FinalizationRegistry. Foreign/expired refs fail.
Residual host handlers record main THREAD CPU: handlerSyncCpuUs (synchronous prefix)
and handlerWindowCpuUs (whole await interval, INCLUDES other concurrent main work),
plus wall durationMs. Window CPU is NOT attributable/exclusive per-call billing.
Telemetry absent means no CPU sampling/byte measurement. No payloads in telemetry.
Worker-owned arbitrary service objects are not transparent graphs; export their
functions explicitly as callbacks. Network/crash persistent handles not provided.

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

Measured (see tracks/track-7/7.P-kit/report.md): dev-loader service floor per isolate is
~90 MiB post-GC heap with kit + local ES client + SO/ESO kernel. 185 types add +0.5 MiB.
Transport per-call/per-MB and telemetry overhead: t7p-transport-002 (see report).
Outstanding 7.P: live scoped local SO security/audit parity and production readiness capture;
session refresh bridge (capture is a per-run snapshot, not token renewal); process sync
transport; distribution/pointer-compression floor; general envelope-size caps on ordinary
calls/run packets (streams and sync are bounded; plain calls are not); broader SO operations;
arbitrary custom error subclasses; production bootstrap. Logger metadata: use
bindService(logger, {positional, ordered}). The trust domain is the isolate (see 0.1.11).

0.1.4 also repairs two Grok findings on0.1: actual Core start client facade now
aliases its concrete client's private capture; waiting-run timeout retires a
never-ready bootstrap when no waiters remain, allowing class recovery.
Stopping execution does not roll back already-admitted host/ES writes. Framework
callers remain responsible for idempotency and authoritative TM persistence.
