## Saved Object Audit Diff OOM Prevention Testing

This folder contains **Scout API tests** that guard against out-of-memory crashes when
the opt-in field-level diff (`xpack.security.audit.savedObjectDiff.*`) processes large
nested saved objects.

They are an **OOM safety gate, not a correctness suite**. The tests assert that Kibana
stays alive and that heap settles below 85% of its limit after each workload.
They are scheduled on the `ci-batch-weekly` Scout channel and can also be run locally.

### 💡 What is tested

| # | Workload | Shape |
|---|---|---|
| 1 | Create + update a single large nested object | 800 nested panels (~10 k leaves) |
| 2 | Bulk create many objects | 20 objects × 80 panels each |
| 3 | Bulk update many objects | 10 objects × 200 panels each; holds before+after for all simultaneously |
| 4 | Create + update a large real dashboard | 60 Lens panels (≈49 KB `panelsJSON` string); title-only update holds both serialized strings at once |
| 5 | Sequential updates to one large object | 15 title-only updates to an 800-panel object; each must release the previous pair |

Each test reads `GET /api/status` before and after the write and asserts that:
- `metrics.process.memory.heap.used_in_bytes / size_limit` settles below 0.85 within 15 s.
- `heap.size_limit` is below 1.8 GB (catches a run on the default, larger heap).

Each write's diff-bearing audit event is also awaited in the local audit log file, so a
Kibana that crashed or stopped emitting fails the test rather than hanging.

### ⚙️ Server configuration

The Scout server config set `security_audit_so_diff_oom` constrains Kibana to a
**1.5 GB old-space heap** (`--max-old-space-size=1536`). This is the smallest heap that
boots a full default Scout Kibana with all plugins enabled.

Server args applied (see `config_sets/security_audit_so_diff_oom/shared.ts` in `@kbn/scout`):
audit enabled with the ECS file appender, `savedObjectDiff.enabled=true`,
`typesToInclude=["index-pattern","dashboard"]`, `fieldSizeLimit=100kb` (so a 60-panel
dashboard's `panelsJSON` is not truncated).

### 🧪 Running locally

One command boots the constrained ES + Kibana stack (the server config set is picked from the
suite path) and runs the tests:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_oom/api/playwright.config.ts
```

To iterate against an already-running stack, start it once and then run Playwright directly:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_oom
```

```bash
node scripts/playwright test --project local \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_oom/api/playwright.config.ts
```

Cloud deployments are not supported: the suite is tagged local-only because it reads the audit
log file written by the Kibana process, which is only reachable when the test runner runs on the
same host.

### ✅ Expected outcomes

All five tests pass when heap settles below 85% after each workload. A heap that stays above
85% or that causes a Kibana crash (503 / timeout on the status endpoint) indicates that
the diff path retains unbounded copies of large objects — the most common cause is
storing the before and after snapshots as live references rather than serializing and
discarding them after the audit event is emitted.
