# Task Manager capacity benchmark (local)

Reproducible memory-heavy workloads for measuring Task Manager throughput and latency against a fixed heap, used to evaluate `xpack.task_manager.capacity: auto` against fixed capacities.

All scripts talk to a running Kibana and Elasticsearch over HTTP with `fetch` only. Run them from the repo root with `node --import tsx <path>`. Defaults are `http://localhost:5601` and `http://localhost:9200` with `elastic:changeme`; override with `KIBANA_URL`, `ES_URL`, `KIBANA_USERNAME`, `KIBANA_PASSWORD`, `ES_USERNAME`, `ES_PASSWORD`.

## 1. Start the stack with a memory limit

```sh
# Elasticsearch
pnpm es snapshot --license trial          # or any locally managed Elasticsearch
node --max-old-space-size=1024 scripts/kibana --dev --no-base-path --no-watch
```

With a locally managed Elasticsearch that uses its own credentials, point `config/kibana.dev.yml` at `kibana_system` and export the `elastic` password for the scripts (`ES_PASSWORD`, `KIBANA_PASSWORD`).

Pass the heap limit as a `node` flag, not via `NODE_OPTIONS`: the dev CLI forwards `process.execArgv` to the server child only, while `NODE_OPTIONS` also reaches the rspack optimizer worker, which needs several GB and dies at 1 GB.

Enable alerting v2 and workflows in `config/kibana.dev.yml` and pin `xpack.task_manager.capacity: 10` as the baseline. Override per experiment, for example append `--xpack.task_manager.capacity=20`, or `--xpack.task_manager.capacity=auto` to let the heap controller size capacity between `adaptive_capacity.min_capacity` and `adaptive_capacity.max_capacity` (defaults 5..50, heap target 75 % of the limit). The controller's latest decision is visible under `stats.configuration.value.adaptive_capacity` in `/api/task_manager/_health` and in the sampler output.

## 2. Seed the wide index

```sh
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/seed_wide_index.ts --rows 1000 --columns 2 --column-bytes 23000
```

One full ES|QL read of that index is about 46 MB. Use `--rows 200` or `--column-bytes 5000` for lighter mixes, or seed a second index with `--index` for a mixed workload.

## 3. Create the workload

```sh
# 20 alerting v2 alert rules, every 1m, each reading the full index (~46 MB per run) into Kibana heap
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_v2_rules.ts --count 20 --kind alert
# --kind signal (default) additionally bulk-writes every row to .rule-events (46 MB per run); a 1 GB ES node rejects that under indexing pressure

# 20 scheduled workflows, every 1m, each with one ES|QL step over the same index (~9 MB per run)
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_workflows.ts --count 20 --limit 200
```

Both accept `--limit N` to cap rows per run and `--every` for the interval. Rules are created in parallel so the first runs form a herd.

Workflows persist each step's output to Elasticsearch (twice per upsert), so a full 46 MB step output exceeds the indexing-pressure limit of a small ES node (`es_rejected_execution_exception`, `max_primary_bytes` = 10 % of ES heap). Keep workflow rows around 200 unless ES has several GB of heap. The step-level `max-step-size` (default 100mb here) overrides the engine's 10 MB default.

## 4. Sample while it runs

```sh
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/sample_tm.ts --label fixed-10-1gb --out ./bench/fixed-10-1gb.ndjson
```

Each line has heap used/limit, RSS, event-loop delay and utilization, Task Manager capacity, overdue count, load percentiles and task-run counters by type. A drop in `process.uptime_ms` is a Kibana restart.

## 5. Clean up

```sh
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_v2_rules.ts --cleanup
node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_workflows.ts --cleanup
curl -u elastic:changeme -XDELETE http://localhost:9200/tm-bench-wide-source
```

## Suggested matrix

| Heap limit | Capacity | Workload |
|---|---|---|
| 1024 MB | 10 fixed vs auto | 20 rules × 46 MB |
| 2048 MB | 10 fixed vs auto | 20 rules × 46 MB, 20 workflows × 46 MB |
| 4096 MB | 10 fixed vs auto | 50 rules × 46 MB + 50 rules `--limit 50` |

Record tasks per minute, p99 schedule drift, overdue count, OOM restarts and the heap level at which the controller backs off.
