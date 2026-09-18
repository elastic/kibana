# Worker process pool (prototype)

> Status: opt-in prototype behind `xpack.task_manager.unsafe.worker_processes`. Disabled by
> default. Not yet supported for production use.

Runs task work (or a portion of it, via `context.runInWorker(...)`) in dedicated Node.js
child processes instead of on Task Manager's own event loop, so long-running or CPU-bound
work doesn't block polling, claiming, or other tasks.

## Why processes, not threads

An earlier iteration of this prototype used a shared pool of `worker_threads` (via Piscina).
It was replaced because a memory budget declared for a worker-thread task was only ever a
soft, best-effort signal:

- `worker_threads` share one address space: there is no OS-level way to measure or limit one
  thread's memory in isolation - only the whole process's RSS is measurable.
- V8's `resourceLimits.maxOldGenerationSizeMb` caps the JS heap only, is fixed pool-wide (not
  per task), and does not see `Buffer`/`ArrayBuffer`/native allocations at all.

Child processes fix all three: each run gets its own address space, so its memory is
directly measurable and, on Linux, kernel-limitable via cgroups v2 - covering JS heap,
Buffers, and native memory together.

## Enforcement model

Every `WorkerPoolService.run()` forks a single-use child (`task_process_wrapper.js`) sized
to `memoryMb + baseline_memory_mb`:

1. **Portable heap cap (always applied):** the child is forked with
   `--max-old-space-size=<memoryMb + baseline_memory_mb>`. This is self-regulating - V8 GCs
   more aggressively as usage approaches the cap - so it only crashes the child when the live
   JS heap genuinely exceeds the budget, not on transient/bursty allocation.
2. **Kernel-enforced hard cap (Linux + cgroups v2 + a writable, delegated subtree - true in
   Docker/Cloud/ECE/ECK):** the child is additionally placed into a dedicated cgroup (see
   `cgroup_enforcer.ts`) with `memory.max` set to the same budget. This is the layer that
   makes the budget a genuine guarantee: it accounts for RSS (heap, Buffers, native memory,
   everything), and the kernel - not application code - kills the child on breach.
   `cpu.weight` is set alongside it so worker processes can't starve Kibana's own event loop
   or each other (see "CPU fairness" below).
3. **Fallback observability (no cgroups):** the child self-reports `process.memoryUsage()`
   every 500ms. If RSS exceeds the budget, the pool only *logs a warning* with the measured
   numbers - it never kills on this. RSS includes heap V8 hasn't returned to the OS yet, so a
   userspace watchdog killing on it would spuriously terminate well-behaved, bursty tasks.
   `xpack.task_manager.unsafe.worker_processes.enforcement: 'strict'` disables the pool
   entirely instead of silently offering a weaker guarantee.

Use `xpack.task_manager.unsafe.worker_processes.enforcement: 'strict'` wherever the capacity
math below needs to hold as a hard guarantee, so the pool refuses to start (worker task types
are simply excluded from claiming, same as when the pool is disabled) rather than degrade.

## Capacity math

Because every in-flight run reserves `declared memoryMb + baseline_memory_mb` against
`max_total_memory_mb`, and - under `enforcement: 'strict'` with cgroups available - the
kernel guarantees no child exceeds its own share, the deployment cannot OOM from worker
process compute:

```
max_total_memory_mb  =  container memory limit (L)  −  memory reserved for main Kibana (K)
```

With that budget set, `Σ(declaredᵢ + baseline_memory_mb)` across all in-flight runs is
admission-controlled to stay within `L − K` (see `WorkerPoolService.hasCapacityFor` /
`availableMemoryMb`), and each individual child is kernel-capped to its own share - so no
combination of concurrently-declared, in-budget tasks can push total memory past `L`.

`baseline_memory_mb` (default 64) is a configured estimate of a fresh child's own runtime
overhead (V8 isolate, module registry, `@kbn/setup-node-env` bootstrap) before any task code
runs; size it generously, or measure a representative child's RSS just after boot and use
that. Setting it too low risks fallback-mode processes being flagged as over budget
immediately (log noise, no kill) or, under cgroups, the child being OOM-killed during its own
bootstrap before task code even starts.

## CPU fairness

`cpu.weight` (proportional, work-conserving - never throttles on an idle machine) is set
alongside the memory cgroup:

- Kibana's own cgroup (`main/`) gets `cpu.weight=1000`; all worker processes combined
  (`tasks/`) get `cpu.weight=100` - under contention Kibana's event loop gets roughly 10x the
  CPU share of every worker process combined.
- Each worker-process child gets an equal `cpu.weight=100`, so one CPU-heavy task cannot
  starve a lighter one; they share contended CPU evenly.
- `max_cpu_percent` optionally adds a hard aggregate `cpu.max` ceiling on `tasks/` for strict
  capacity planning; off by default since `max_processes` already bounds worker CPU to N
  cores.
- Where cgroups are unavailable, `os.setPriority()` (portable: macOS/Windows/Linux) lowers
  each child's OS scheduling priority as a weaker, best-effort version of the same idea.

Per-task CPU declarations are not yet part of the task contract; `max_processes` is
currently the only CPU admission knob.

## Known gaps / follow-ups

- No warm-process reuse yet - every run forks a fresh child (`idle_timeout` is reserved for
  this). Simpler and correct; fork/bootstrap latency is the cost, not yet benchmarked here.
- Adaptive admission from measured peaks (heap/RSS self-reports, cgroup `memory.peak`) is not
  implemented - the data is logged, but the ledger still trusts declared `memoryMb`.
- Kubernetes needs a writable, delegated cgroup v2 subtree for the kernel-enforced path to
  apply; verify with a cluster-specific check before relying on `enforcement: 'strict'`.
- Windows has no equivalent kernel mechanism (Job Objects were not implemented in this
  iteration); the fallback path is what's available there.
