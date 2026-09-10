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
| 1 | Create + update a single large object | 800 nested panels (~10 k leaves) |
| 2 | Bulk create many objects | 20 objects × 80 panels each |
| 3 | Bulk update many objects | 10 objects × 200 panels each; holds before+after for all simultaneously |
| 4 | Sequential updates to one large object | 15 title-only updates to an 800-panel object; each must release the previous pair |

Each test calls `GET /api/stats?extended=true` after the write and asserts that:
- Kibana returns `available: true`.
- `heap.used_in_bytes / heap.size_limit` is below 0.85.
- `heap.size_limit` does not exceed 1.8 GB (catches misconfigured stack).

### ⚙️ Server configuration

The Scout server config set `security_audit_so_diff_oom` constrains Kibana to a
**1.5 GB old-space heap** (`--max-old-space-size=1536`). This is the smallest heap that
boots a full default Scout Kibana with all plugins enabled.

Server args applied: audit enabled, `savedObjectDiff.enabled=true`,
`typesToInclude=["index-pattern"]`.

### 🧪 Running locally

Boot the constrained stack:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_oom
```

In a second terminal:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_oom/api/playwright.config.ts
```

### ☁️ Running against a Cloud deployment

Create a deployment with a **1 GB RAM Kibana instance** in a **CFT region** (`gcp-us-west2`
or `aws-eu-west-1`). Other regions restrict `user_settings_yaml` to allow-listed keys and
`savedObjectDiff` is not on that list.

Under **Kibana user settings** apply:

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.savedObjectDiff.enabled: true
xpack.security.audit.savedObjectDiff.typesToInclude: ["index-pattern"]
```

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

Run the suite:

```bash
node scripts/scout run-tests --location cloud --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_oom/api/playwright.config.ts
```

On Cloud the audit log file is not readable from the test runner so the heap checks are
the primary signal; the audit correctness tests in `scout_security_audit_so_diff` cover
event content separately.

### ✅ Expected outcomes

Both tests pass when heap settles below 85% after each workload. A heap that stays above
85% or that causes a Kibana crash (503 / timeout on the stats endpoint) indicates that
the diff path retains unbounded copies of large objects — the most common cause is
storing the before and after snapshots as live references rather than serializing and
discarding them after the audit event is emitted.
