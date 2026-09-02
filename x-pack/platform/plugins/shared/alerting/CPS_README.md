# Cross-Project Search (CPS) in Alerting

## What is CPS?

Cross-Project Search (CPS) is an Elasticsearch feature available on serverless deployments that lets Kibana route queries across multiple Elastic projects transparently. Kibana acts as a thin orchestrator: it attaches a `project_routing` parameter to Elasticsearch requests, and Elasticsearch handles execution, security enforcement, and result aggregation across the targeted projects.

CPS is controlled by the `cps.cpsEnabled` flag in the Kibana configuration. When disabled, `project_routing` is stripped from all requests unconditionally.

For the core CPS implementation details, see:
- [`src/platform/plugins/shared/cps/README.md`](../../../../../src/platform/plugins/shared/cps/README.md)
- [`src/core/packages/elasticsearch/client-server-internal/src/cps_request_handler/README.md`](../../../../../src/core/packages/elasticsearch/client-server-internal/src/cps_request_handler/README.md)

## How Alerting Uses CPS

### Project Routing for Rule Execution

During rule execution, all Elasticsearch-facing clients are scoped with `projectRouting: 'space'`. This means that when CPS is enabled, rule queries target the Elasticsearch project associated with the rule's Kibana space. If no project routing is defined for the space, the system falls back to `'all'` (routing across all projects).

The following clients are created with CPS-aware project routing in `get_executor_services.ts`:

| Client | Method |
|--------|--------|
| Scoped Elasticsearch client | `elasticsearch.client.asScoped(fakeRequest, { projectRouting: 'space' })` |
| Search source client | `data.search.searchSource.asScoped(fakeRequest, { projectRouting: 'space' })` |
| Async search client | `data.search.asScoped(fakeRequest, { projectRouting: 'space' })` |

## UIAM API Keys and CPS

CPS and UIAM (Universal Identity and Access Management) are orthogonal subsystems that work together in serverless environments:

- **CPS** answers: *"How are Elasticsearch requests routed across projects?"* (via `project_routing`)
- **UIAM** answers: *"Who is making this request?"* (via API key identity)

Both are serverless-only features that intersect during rule execution: the `fakeRequest` carries the UIAM credential for identity, while the scoped clients inject `project_routing` for query routing.

### UIAM API Key Lifecycle in Alerting

#### Creation (Dual-Key Model)

When a rule is created with a system-generated API key, alerting creates **two** API keys in parallel:

1. **ES API key** — via `security.authc.apiKeys.grantAsInternalUser`, stored as `apiKey` on the rule saved object
2. **UIAM API key** (optional) — via `security.authc.apiKeys.uiam.grant`, stored as `uiamApiKey` on the rule saved object

Both keys are base64-encoded as `id:secret` and encrypted in the saved object. If the ES key creation fails after a UIAM key was created, the UIAM key is immediately invalidated to prevent orphans.

The UIAM grant only occurs when:
- `shouldGrantUiam` is `true` (i.e., Core exposes the UIAM API: `core.security.authc.apiKeys.uiam` exists)
- The incoming request has valid UIAM credentials (checked via `isUiamCredential`)

#### User-Created API Keys

When a user authenticates with their own API key:
- If the key is a UIAM credential, it's stored as `uiamResult` only (no ES `result`)
- If the key is a regular ES credential, it's stored as `result` only
- UIAM credentials are **rejected** when `shouldGrantUiam` is `false`

#### Execution (Key Selection)

At execution time, the alerting task runner decrypts the rule and builds a synthetic `KibanaRequest` whose `Authorization` header determines the identity for the entire run.

The key selection logic in `rule_loader.ts`:

| Condition | Key Used |
|-----------|----------|
| `shouldGrantUiam && apiKeyType === 'uiam'` and `uiamApiKey` exists | UIAM API key |
| `shouldGrantUiam && apiKeyType === 'uiam'` but `uiamApiKey` is missing | Falls back to ES API key (logs warning with `uiam-api-key-missing` tag) |
| Otherwise | ES API key |

The `apiKeyType` setting is configured via `xpack.alerting.rules.apiKeyType` (`'es'` or `'uiam'`, default `'es'`).

#### Storage

Both keys are stored as encrypted attributes on the rule saved object:

| Attribute | Content |
|-----------|---------|
| `apiKey` | Base64-encoded ES API key (`id:secret`) |
| `uiamApiKey` | Base64-encoded UIAM API key (`id:secret`), optional |
| `apiKeyOwner` | Username of the key owner |
| `apiKeyCreatedByUser` | `true` if the user authenticated with their own API key |

#### Provisioning (Backfill for Existing Rules)

The `UiamApiKeyProvisioningTask` runs on serverless deployments when the `alerting.rules.provisionUiamApiKeys` feature flag is enabled. It:

1. Finds rules with system ES keys but no `uiamApiKey`
2. Converts existing ES keys to UIAM keys via `security.authc.apiKeys.uiam.convert`
3. Bulk-updates rule saved objects with the new UIAM keys
4. Writes `uiam_api_keys_provisioning_status` saved objects for tracking
5. Queues orphaned UIAM keys for invalidation on failure

Rules that should have a UIAM key but don't are tagged with `Missing Elastic Cloud API Key` (the `MISSING_UIAM_API_KEY_TAG`).

#### Self-Healing (Repair During a Rule Run)

When a rule run fails because its UIAM key is unusable, `repairUiamApiKey` (`task_runner/lib/repair_uiam_api_key.ts`) re-grants the key so the next run authenticates with a working credential instead of failing indefinitely. Two rejections qualify:

| Rejection | Wire shape |
| --- | --- |
| UIAM does not know the key (`APIKEY_MISSING`) | HTTP 401 with `authentication_error_code: 0x28D520` |
| UIAM knows the key and will not authorize it | HTTP 403 `security_exception: failed to authorize cloud API key` |

Both are matched structurally and by message, because rule types that record a failed run rather than throwing (Security Solution's detection rules) flatten the Elasticsearch error to text. `isUnusableUiamApiKeyMessage` is exported from the plugin so those call sites can flag a rejection they would otherwise swallow.

Each attempt that reaches a verdict is recorded on the rule's `uiam_api_keys_provisioning_status` saved object — the same document the provisioning task writes, keyed on the rule id — so the healer and the provisioning task cannot independently retry the same doomed conversion. A recorded attempt stops the next one, which matters because a rule can run every minute:

- A permanent UIAM verdict (`PERMANENT_UIAM_CONVERSION_ERROR_CODES`) is about the identity that created the key, so it is never retried.
- Any other recorded attempt is scoped to `apiKeyId`, the Elasticsearch key it was made for. Re-saving a rule re-mints that key under a new id, which resets the record.
- Failures that say nothing about the credential — `uiamConvert` unreachable, a version conflict, a deleted rule — are not recorded and are retried on the next run.

When UIAM refuses the conversion it also states why, and that reason is the only explanation Kibana ever gets. It is recorded on the rule's last run as well as the status document, so the rule reports (for example) `API key creator is not an organization member` rather than a bare refusal.

#### Invalidation

API key invalidation is handled by the `alerts_invalidate_api_keys` task, which:
- Runs on a configurable schedule (default: every 5 minutes)
- Processes `api_key_pending_invalidation` saved objects
- Calls `security.authc.apiKeys.invalidateAsInternalUser` for ES keys
- Calls `security.authc.apiKeys.uiam.invalidate` for UIAM keys

Both ES and UIAM keys are queued for invalidation during rule create, update, enable, disable, and delete operations.

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `xpack.alerting.rules.apiKeyType` | `'es'` \| `'uiam'` | `'es'` | Which API key type to use for the fake request during rule execution |
| `xpack.alerting.invalidateApiKeysTask.interval` | duration | `'5m'` | How often the API key invalidation task runs |
| `xpack.alerting.invalidateApiKeysTask.removalDelay` | duration | `'1h'` | Minimum age before a pending API key is invalidated |

| Feature Flag | Description |
|-------------|-------------|
| `alerting.rules.provisionUiamApiKeys` | Enables the UIAM API key provisioning task and missing-key tagging (serverless only) |

## Structured Log Tags

All UIAM-related log entries use structured tags for filtering:

| Tag Set | Usage |
|---------|-------|
| `serverless, alerting, uiam, uiam-api-key-grant` | UIAM key creation events |
| `serverless, alerting, uiam, uiam-api-key-invalidate` | UIAM key invalidation events |
| `serverless, alerting, uiam, uiam-api-key-invalid-credentials` | Invalid/missing UIAM credentials |
| `serverless, alerting, uiam, uiam-api-key-missing` | Fallback to ES key due to missing UIAM key |

## Relationship to Task Manager

Task Manager provides generic infrastructure that alerting leverages:

- **Invalidation framework:** Alerting imports `runInvalidate` from `@kbn/task-manager-plugin/server` and passes both `invalidateApiKeyFn` (ES) and `invalidateUiamApiKeyFn` (UIAM) to handle both key types.
- **Task scheduling:** Both the `UiamApiKeyProvisioningTask` and the `alerts_invalidate_api_keys` task are registered with and scheduled by Task Manager.
- **Config schema:** Task Manager declares its own `api_key_type` enum (`'es'` | `'uiam'`) in its config, but this is **not used at runtime** in Task Manager's own execution pipeline. Rule-level UIAM key selection lives entirely in alerting's `rule_loader.ts`.
