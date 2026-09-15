## Saved Object Audit Diff Performance Testing

This folder contains **Scout API tests** and a **`@kbn/bench` micro-benchmark** that measure
the cost of the opt-in field-level diff added to saved object audit events
(`xpack.security.audit.savedObjectDiff.*`).

They are a **measurement suite, not a regression gate**. The tests only assert that writes
succeed and Kibana stays available; the value is in the metrics they attach to the report.
They are scheduled on the `ci-batch-weekly` Scout channel rather than on every commit, and
are intended to be run by hand when the diff path changes or before a release.

### 💡 What is measured

Two layers:

- **Micro-benchmark (`benchmarks/`)**: calls the diff helper `computeJsonPatch` directly on
  synthetic objects of known shape and reports CPU time per call, patch size, ops/noOps
  counts, and (with `--expose-gc`) heap allocated per call and heap retained by the result.
  Answers "what does one diff of an N-leaf object cost?".
- **End-to-end suite (`api/`)**: runs five write workloads through the public saved objects
  API against a running Kibana and samples Kibana's process metrics around each one.
  Answers "what happens to the event loop, memory, and audit volume under load?". Run it once
  with diffs **on** and once with diffs **off** and compare.

| # | Workload | Shape |
|---|---|---|
| 1 | Sequential bulk create | 5 batches × 3 objects × 2000 nested panels (≈10k leaves each) |
| 2 | Sequential single update | 40 title-only updates to one 2000-panel object |
| 3 | Sequential bulk update | 5 rounds × 20 objects × 400 panels |
| 4 | Import with overwrite | 2 passes × 30 objects × 200 panels; the second pass overwrites, exercising before-state reads |
| 5 | Concurrent bulk create | 3 rounds × 8 parallel batches × 6 objects × 1000 panels |

Every request stays under 1 MB so the same suite runs against Cloud deployments, whose default
`server.maxPayload` is 1 MB.

Per workload the suite records: client latency p50 / p95 / max, event loop delay max and p99,
event loop utilization peak (from `GET /api/stats?extended=true`, polled every second), heap
before / peak / settled and RSS peak, and, when the audit log file is readable from the test
runner (local runs only), audit events and KB written.

All objects the suite creates are `index-pattern` saved objects with ids prefixed
`so-diff-perf-` and are deleted after each test.

### ⚙️ Server configuration

Two Scout server config sets exist for local runs, identical except for the feature flag:

| Config set | Diffs | Notes |
|---|---|---|
| `security_audit_so_diff_perf` | on | 1.5 GB old-space heap, audit file appender, `typesToInclude: ["index-pattern"]`, `ops.interval: 2000` |
| `security_audit_so_diff_perf_baseline` | off | same heap, appender and ops interval |

The 1.5 GB heap is the smallest that boots the full default Scout Kibana. To reproduce Cloud's
1 GB instance size, use a Cloud deployment (below).

### 🧪 Running locally

Boot the diffs-on stack and run the suite:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_perf
```

In a second terminal:

```bash
SO_DIFF_PERF_LABEL=diffs-on node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/api/playwright.config.ts
```

Stop the stack, then repeat with the baseline config set and label:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_perf_baseline
SO_DIFF_PERF_LABEL=diffs-off node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/api/playwright.config.ts
```

`SO_DIFF_PERF_LABEL` is a free-form label stored in the results so the two runs can be told apart.

### ☁️ Running against a Cloud deployment

To reproduce the memory conditions that matter, create a deployment in Elastic Cloud with a
**1 GB RAM Kibana instance** in a **CFT region** (`gcp-us-west2` or `aws-eu-west-1`). Other
regions restrict `user_settings_yaml` to allow-listed keys and `savedObjectDiff` /
`ops.interval` are not on that list.

Under **Kibana user settings** apply (diffs-on run):

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.savedObjectDiff.enabled: true
xpack.security.audit.savedObjectDiff.typesToInclude: ["index-pattern"]
ops.interval: 2000
```

For the baseline run, omit the two `savedObjectDiff` lines (or set `enabled: false`).
Either create two deployments or change the settings between runs.

Once the deployment is up, write `.scout/servers/cloud_ech.json`:

```json
{
  "serverless": false,
  "isCloud": true,
  "cloudHostName": "cloud.elastic.co",
  "cloudUsersFilePath": "<absolute-path>/role_users.json",
  "hosts": {
    "kibana": "https://<deployment>.kb.<region>.gcp.elastic-cloud.com",
    "elasticsearch": "https://<deployment>.es.<region>.gcp.elastic-cloud.com"
  },
  "auth": { "username": "elastic", "password": "<password>" }
}
```

`role_users.json` maps role names to `{ "email": "...", "password": "..." }` for Cloud SAML
login. The tests use `admin`; set it to the `elastic` superuser credentials:

```json
{
  "admin": { "email": "<elastic-user-email>", "password": "<password>" },
  "custom_role_worker_1": { "email": "<elastic-user-email>", "password": "<password>" }
}
```

Run the suite against it:

```bash
SO_DIFF_PERF_LABEL=diffs-on-1gb-ech node scripts/scout run-tests --location cloud --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/api/playwright.config.ts
```

On Cloud the audit log file is not readable from the test runner, so the audit volume columns
read `n/a`. The per-event size is deterministic for a given object shape; use the
micro-benchmark's `serialized kibana.diff size` column for it.

### 📊 Reading the results

Each workload test attaches a JSON row to the Playwright report, and the final `summary` test
attaches the full run as `saved_object_diff_perf.json` and a markdown table as
`saved_object_diff_perf.md`, and prints the table to the console. Put the diffs-on and
diffs-off tables side by side; the interesting deltas are event loop delay and latency under
the concurrent workload, and audit KB written.

Treat differences under about 10% as run-to-run noise. The roughly one second floor on every
request is Elasticsearch's write refresh, not Kibana.

`results/` holds tables from past runs, with the environment they were taken on.

### 🔬 Micro-benchmark

From the repository root:

```bash
NODE_OPTIONS=--expose-gc node scripts/bench --config \
  x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/benchmarks/saved_object_diff.benchmark.config.ts
```

Without `--expose-gc` the timing and size columns are still reported; the two heap columns
read zero. Scenarios live in `benchmarks/scenarios.ts`; each `*.ts` next to it is one
scenario. `@kbn/bench` supports `--left <ref> --right <ref>` to compare two commits.

### ✅ Expected outcomes

- Every workload's requests return 200 and Kibana reports `available` afterwards, in both modes.
- Heap peak and settled heap should be within a few percent between modes; the diff allocates
  transient garbage but retains only the event payload.
- Event loop delay and latency should be unchanged for sequential workloads and rise only
  under the concurrent workload, in proportion to leaves per object.
- Audit KB written grows by roughly the micro-benchmark's per-event size times the number of
  writes when diffs are on.

An out-of-memory crash, a heap that does not settle, or event loop delay growing across
workloads indicates a problem in the diff path.
