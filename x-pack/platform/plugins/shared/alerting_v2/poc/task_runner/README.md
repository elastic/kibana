# Self-contained task pods (PoC)

A "task pod" is a single standby process that bundles everything one family of Task Manager task
types needs to run for real — a real Elasticsearch client, a real identity resolution path, and (in
most pods) a real Saved Objects repository — without booting the rest of Kibana. Task Manager (or a
poking service standing in for it) keeps the process warm and pokes it over HTTP instead of
exec'ing a one-shot CLI per run.

See [FINDINGS.md](./FINDINGS.md) for what each pod proves, what is deliberately out of scope, and
the RSS/bundle measurements. This file is just "how do I run one locally".

## 1. Prerequisites

An Elasticsearch cluster. From the repo root:

```bash
node scripts/es snapshot --license=trial
```

Defaults to `http://localhost:9200`, `elastic` / `changeme` — every command below assumes that.

The **Alerting v2** pod is the one exception that also needs real Kibana, because it only *runs*
rule-executor tasks, it doesn't create rules. Start it with this PoC's config, separately:

```bash
node scripts/kibana --dev -c x-pack/platform/plugins/shared/alerting_v2/poc/task_runner/kibana.poc.yml
```

The **Notification Center**, **Workflows** and **Connectors** pods only need Elasticsearch.

## 2. Build

From this directory (`x-pack/platform/plugins/shared/alerting_v2/poc/task_runner`):

```bash
node build.mjs --all           # builds all five entries into out/
node build.mjs --all --minify  # minified, matches the FINDINGS.md bundle-size numbers
```

Or build one pod at a time while iterating:

```bash
node build.mjs --entry pod/main_connectors.ts --out out/pod_connectors.js
```

## 3. Run

Each pod is a standalone HTTP server (`pod/server.ts`): `GET /health`, `POST /run`, `POST
/cancel/:executionUuid`. Env vars: `ES_URL`, `ES_USERNAME`/`ES_PASSWORD` (or `ES_API_KEY`), `PORT`.
Each pod has its own default port, so they can all run side by side:

| Pod | Entry | Default port | Needs |
| --- | --- | --- | --- |
| Alerting v2 | `out/pod_alerting_v2.js` | 4100 | ES + real Kibana (to create a rule/API key first) |
| Notification Center | `out/pod_notification_center.js` | 4101 | ES only |
| Workflows Execution Engine | `out/pod_workflows.js` | 4102 | ES only |
| Connectors (server-log, es_index) | `out/pod_connectors.js` | 4103 | ES only |

```bash
ES_URL=http://localhost:9200 ES_USERNAME=elastic ES_PASSWORD=changeme \
  node out/pod_connectors.js &

curl -s http://localhost:4103/health
# {"inFlight":0,"rss":...}
```

**A pod's own log output (from the real, unmodified task code) goes to that process's stderr, as a
JSON line — not into the `/run` response body.** If you post a request and don't see the effect you
expect, check the pod's own terminal, not curl's output.

## 4. Poke it

### Notification Center — easiest, no setup

```bash
curl -s -X POST http://localhost:4101/run -H 'content-type: application/json' -d '{
  "taskType": "notification-center:cleanup",
  "taskInstance": {"id": "nc-1", "params": {}, "state": {}, "attempts": 0},
  "executionUuid": "exec-1", "spaceId": "default", "timeoutMs": 30000
}'
```

### Connectors — `taskType: "connector:execute"`

`server-log`:

```bash
curl -s -X POST http://localhost:4103/run -H 'content-type: application/json' -d '{
  "taskType": "connector:execute",
  "taskInstance": {
    "id": "c-1",
    "params": {
      "connectorType": "server-log",
      "config": {},
      "secrets": {},
      "params": { "message": "hello from the pod", "level": "info" }
    },
    "state": {}, "attempts": 0
  },
  "executionUuid": "exec-1", "spaceId": "default", "timeoutMs": 30000
}'
```

`es_index` (writes a real document to `poc-index`, creating it first):

```bash
curl -s -X PUT http://localhost:9200/poc-index -u elastic:changeme

curl -s -X POST http://localhost:4103/run -H 'content-type: application/json' -d '{
  "taskType": "connector:execute",
  "taskInstance": {
    "id": "c-2",
    "params": {
      "connectorType": "es_index",
      "config": { "index": "poc-index", "refresh": true, "executionTimeField": null },
      "secrets": {},
      "params": { "documents": [{ "hello": "from the pod" }], "indexOverride": null }
    },
    "state": {}, "attempts": 0
  },
  "executionUuid": "exec-2", "spaceId": "default", "timeoutMs": 30000
}'
```

Config/secrets are supplied directly in the request rather than resolved from Kibana's connector
saved objects — see FINDINGS.md's Stage B2 section for why, and what that leaves unmeasured.

### Alerting v2 — needs a real rule, created through real Kibana

With both ES and the PoC Kibana from step 1 running:

```bash
node e2e.mjs seed                                       # seeds sample data
node e2e.mjs create-rule                                # prints a ruleId
node e2e.mjs api-key /tmp/rule_api_key.txt               # writes an encoded API key
node e2e.mjs run-body <ruleId> /tmp/rule_api_key.txt > /tmp/run_body.json

curl -s -X POST http://localhost:4100/run -H 'content-type: application/json' -d @/tmp/run_body.json
```

Compare against a real Kibana run of the same rule with `node e2e.mjs run-rule <ruleId>`, `node
e2e.mjs capture <ruleId> out.json` against both, and `node e2e.mjs diff kibana.json pod.json`.

### Workflows Execution Engine

Registers `workflow:run`, `workflow:resume` and `workflow:scheduled`, backed by a real, unmodified
`WorkflowsExecutionEnginePlugin.setup()`/`start()`. As documented in FINDINGS.md, this PoC exercised
the plugin's lifecycle and its repository-backed "execution not found" failure path, not a full
compiled workflow run — there's no seed script here for a persisted workflow + execution. A `/run`
call with a `workflowRunId` that doesn't exist in `.kibana_task_manager` / the workflows indices
will fail predictably rather than silently; that's expected, not a pod bug.

## 5. Measure

```bash
node measure.mjs --label "connectors pod at READY" -- node out/pod_connectors.js
node analyze_meta.mjs out/pod_connectors.meta.json            # package-level bundle breakdown
node analyze_meta.mjs out/pod_connectors.meta.json --why elastic-apm-node   # why is X in the bundle
```

Or run `node smoke.mjs` for a one-command rebuild + boot + RSS check + one real run each for the
two pods that need no external setup (Notification Center, Connectors).
