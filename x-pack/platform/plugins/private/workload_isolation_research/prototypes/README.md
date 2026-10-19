# Track 1 standalone prototypes — research only

Not a Core API, Task Manager adapter, live ES/SO integration, built Kibana distribution or production proposal. No stacks/images/Node source builds. Run with pinned Node 24.21.0.

## Reproduce from this plugin directory

```sh
node --test prototypes/task_execution/isolated_runner.node_test.ts
node prototypes/task_execution/economics.ts thread 10
node prototypes/task_execution/economics.ts process 10
node /Users/jloleysens/repos/work/kibana/node_modules/typescript/bin/tsc --project prototypes/tsconfig.json
```

The native Node test deliberately does not use Jest's `.test.ts` suffix: it must not be accidentally collected by the plugin's Jest configuration. Uses real worker/child-process execution, independent hard termination, generation fencing, same-class kill collateral, and a local-only large byte fixture. Timing assertions are looser than scientific priors; inspect recorded numbers separately. No TM capacity/adoption claim.

## SO kernel fixture

```sh
WIR_RUN_ID=<preregistered-id> WIR_FORCE_GC=1 node --expose-gc prototypes/task_execution/capsule_probe.ts 10
WIR_CAPSULE_STATIC_IMPORTS=1 node prototypes/task_execution/bundle_capsule.ts
WIR_RUN_ID=<preregistered-id> WIR_FORCE_GC=1 WIR_CAPSULE_BUNDLE=1 node --expose-gc prototypes/task_execution/capsule_probe.ts 10
```

Run `capsule_probe.ts 1` in a separate process for n=1. `WIR_CAPSULE_STATIC_IMPORTS=1` lifts six known bootstrap requires into named imports for the bundler; unset it to reproduce namespace-require linking. Generated bundle is `task_capsule/target/capsule_kernel.cjs` (ignored), hash recorded per run. Uses public SO package entries and installed npm dependencies through the explicitly read-only main checkout; this local spike hardcodes that resolver/type path. Key SO sources were checked byte-identical across the two revisions. Both Node compile and SWC disk caches are disabled; the main checkout is never an output location.

Actual SO registry, document migrator, serializer and repository run in each isolate. A typed fake network connection supplies ES JSON; the real client decodes it. Assertions: model version 1→2 backfill, hidden type allowlist, foreign-namespace raw-ID not-found, unknown-type not-found; canonical result agrees with the same main-isolate fixture. The IKibanaMigrator adapter explicitly refuses startup migrations and reports no completed index-readiness status. **No ESO/security/spaces extension or live data proof.** Namespace not-found is not RBAC denial.

Workers stay resident until the driver terminates them in `finally`. Native import/initialisation allocations and GC affect memory. `WIR_FORCE_GC=1` is a measurement-only option; it is not a production memory-management proposal. Heap samples are per isolate, RSS is per process and never summed across workers. Same-container processes/threads share CPU/cgroup memory and are not an untrusted-code security boundary. Ten fixture kernels are **not** six actual alerting + three workflow + one Agent Builder run.

The static-named bundle hoists imports, so `setup_and_probe_ms` no longer includes dependency initialisation; compare **driver `batch_cold_ms`**, not that internal sub-timer, across linkage strategies.

## Evidence and derivation

Preregister before each new measurement. External artefacts:
`~/.agentic-work/projects/kibana/workload-isolation-research/tracks/track-1/evidence/`.

```sh
node prototypes/task_execution/summarize_results.ts <raw-log-path> [more-raw-log-paths...]
```

This deterministically converts raw byte counts to MiB and retains source filenames/run IDs. Benchmark logs carry source/bundle hashes. Negative attempts remain archived. No harness scorecard claim is valid until Track 0's released harness/calibration and Phase-B review.
