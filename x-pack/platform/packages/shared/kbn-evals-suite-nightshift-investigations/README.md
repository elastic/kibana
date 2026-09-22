# @kbn/evals-suite-nightshift-investigations

Native evaluation suite for [Nightshift investigations](../../../plugins/shared/nightshift_investigations).
The default eval runs the approved `suite/investigate-lite` examples from `deductive/doordashv2`
through the manual investigation route and grades the Nightshift Deductive Investigator.

This is **Harness Parity**: the target has no DoorDash telemetry access. Low scores measure the
behavior of this setup and are not claims about investigation capability. Cortex and workspace
persistence are disabled; example concurrency is 2.

## Running the golden eval

Prerequisites: the repository's pinned Node version and bootstrapped dependencies, Docker with
container IPs reachable from the host (for example OrbStack), Go for the external sandbox,
a configured model connector, and credentials for the golden evaluations cluster.

1. Create a local `golden` profile using the [eval profile instructions](../kbn-evals/README.md#profiles).
   Its ignored `kbn-evals/scripts/vault/config.golden.json` needs `evaluationsKbn`,
   `evaluationsEs`, `tracingEs`, `tracingExporters`, and the model provider configuration.
   Use the existing access credentials; keep the file local. Golden examples do not need
   `gcsDatasetAccessCredentials`.
2. Start the native sandbox services as described below and export the same `SANDBOX_API_KEY`
   in the terminal running evals.
3. Run the standard entry point:

```bash
node scripts/evals start --suite nightshift-investigations --profile golden
```

`start` launches Scout Elasticsearch (`9220`), Kibana (`5620`) and EDOT. It leaves sandbox-api
running separately. To reuse the stack, use `node scripts/evals run` with the same flags.
Configure connectors using the [standard eval model setup](../kbn-evals/README.md#11-getting-started-locally).
For the reference comparison, explicitly select Claude Sonnet 4.6 as judge; for example, when
that OpenRouter connector is configured:

```bash
node scripts/evals start --suite nightshift-investigations --profile golden \
  --model openrouter-anthropic-claude-sonnet-4-6 \
  --judge openrouter-anthropic-claude-sonnet-4-6
```

The profile's default judge may differ. `--model` controls the investigator and `--judge`
controls the graders. The spec assigns the selected model to `significant_events_investigation`.
The four-example lite slice is intended to finish within the 55-minute test timeout.

### External sandbox prerequisite

Run [elastic/sandbox-service](https://github.com/elastic/sandbox-service) natively with its
Docker backend. The suite does not start it. From a local clone:

```bash
git clone https://github.com/elastic/sandbox-service.git
cd sandbox-service
make build-container-manager build-sandbox-api
docker build -f Dockerfile.sandbox -t nightshift-golden-sandbox .
docker network create nightshift-golden-sandbox
mkdir -p ssl /tmp/nightshift-golden-workspaces
openssl req -x509 -newkey rsa:2048 -nodes -days 7 \
  -keyout ssl/server.key -out ssl/server.crt \
  -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost'
```

In a terminal in that clone, start container-manager:

```bash
CLUSTER_NAME=localhost \
WORKSPACE_PVC_PATH=/tmp/nightshift-golden-workspaces \
CONTAINERMANAGER_SANDBOX_IMAGE=nightshift-golden-sandbox \
CONTAINERMANAGER_DOCKER_SANDBOX_NETWORK=nightshift-golden-sandbox \
bin/container-manager-service
```

In another terminal in the clone, generate a local key and start the API. Export the same key
in the eval terminal; do not include it in source control or evidence reports.

```bash
export SANDBOX_API_KEY="$(openssl rand -hex 32)"
CONTAINERMANAGER_ADDRESS=localhost:50051 \
CONTAINERMANAGER_CA_CERT="$PWD/ssl/server.crt" \
SANDBOX_API_ADDRESS=:8090 \
bin/sandbox-api
```

The gRPC API listens on `9090`; `8090` is only for probes. Leave the `WORKSPACE_SNAPSHOT_*`
variables unset so each new conversation starts independently. The Docker network must allow
native sandbox-api to reach container ports `8080` and `8081`. The sandbox must also reach
Scout Elasticsearch at `http://host.docker.internal:9220`; override
`NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` if your Docker networking uses another address.

The `evals_nightshift_investigations` Scout config extends `evals_tracing`. It adds the plugin,
sandbox, a preconfigured basic-auth telemetry webhook, Agent Builder experimental features,
and all eight tracing/privacy settings. Both trace exporters use the selected profile.
The telemetry connector exposes only the ephemeral Scout cluster. Existing preconfigured-only,
agent allow-list and execute-authorization checks still apply.

## Dataset procurement contract

The committed [example schema](evals/golden/example.schema.json) describes one example.
[`types.ts`](evals/golden/types.ts) validates it at runtime. Upload approved examples to the source
dataset through the owning team's reviewed workflow. No source examples are stored in this repo.

Global setup reads `deductive/doordashv2` by name from the selected cluster into a temporary
file with owner-only access. Collection reads it synchronously, excludes archived examples,
and intersects all requested `metadata.dataset_split` tags (AND semantics). Only
`suite/investigate-lite` is currently registered, under **`nightshift/investigate-lite`**.
The source is read-only; the native runner upserts only the derived nightshift-owned dataset.
Temporary source data is removed after the run.

| Field | Requirement and meaning |
| --- | --- |
| `input.question` | Required nonempty string, up to 9,508 characters (the product limit of 10,000 minus the 492-character suffix). Only this text plus the exact eval constraints suffix reaches the investigator. |
| `output.reference_answer` | Expected answer for the RCA graders, up to 100,000 characters. Supply this for new examples. |
| `output.answer` | Legacy goal-grader fallback when `reference_answer` is absent. At least one answer must be nonempty. RCA graders use `reference_answer`. |
| `metadata.langsmith_example_id` | Required source LangSmith example ID, retained for comparison joins. |
| `metadata.source_kbn_example_id` | Added by derivation from the source example's persisted ID, for Phase C joins. |
| `metadata.max_latency_seconds` | Required positive budget in seconds. Existing numeric strings are preserved in metadata and read numerically by the task. No budget uplift. |
| `metadata.dataset_split` | Required array of split tags, including `suite/investigate-lite` to enter this run. |
| `metadata.case_id` | Optional stable test identifier; otherwise the LangSmith example ID is used. |
| `metadata.category` | Optional rubric selector. `investigate` selects the investigation rubric; so do supported alert-debug question prefixes. |
| `metadata.status` | Optional lifecycle state; `archived` examples are excluded. |
| Additional input, output, metadata fields | Preserved as JSON, including provenance and existing split tags. |

The JSON schema is generated from the runtime definition and a Jest test checks they match.
After changing the contract, regenerate it from the repository root:

```bash
node -r @kbn/setup-node-env <<'JS'
const fs = require('fs');
const { z } = require('@kbn/zod/v4');
const directory = 'x-pack/platform/packages/shared/kbn-evals-suite-nightshift-investigations/evals/golden';
const { goldenExampleSchema } = require(`./${directory}/types`);
fs.writeFileSync(`${directory}/example.schema.json`, JSON.stringify(z.toJSONSchema(goldenExampleSchema), null, 2) + '\n');
JS
```

The full investigate slice and Turing/copilot evaluations are deferred.

## Evaluators and evidence

The task starts a manual `POST /internal/nightshift/investigations`, polls its record to a
terminal status, and surfaces the workflow's `investigate` step error. Its ID is the workflow
execution ID. Conversation tool calls become a Trajectory with outputs capped at 2,000
characters; tool counts come from those same steps. The structured report is rendered as
markdown with conclusion, severity, hypotheses ranked by confidence, reasons, recommendations
and blind spots.

Task output retains the 16 Deductive fields (`test_id`, `query`, `max_latency_seconds`,
`metrics`, `latency_seconds`, `tool_names_invoked`, `total_tool_calls`, `failed_tool_calls`,
`final_answer`, `healthcheck`, `as_of_offset_minutes`, `as_of_ts`, `severity_truth`,
`outcome_after_as_of`, `execution_error`, `trajectory`) and adds `investigation_id`,
`conversation_id`, `workflow_status`, `structured_report`. The native `traceId` field points
to the agent conversation's trace, accepting either string or array round representations.

The 18 golden keys are `goal_pass`, `latency_ok`, `latency_seconds`, `latency_budget_seconds`,
`tool_calls_total`, `tool_calls_failed`, `cost_usd`, `rca_entity_recall`, `rca_false_positive`,
`rca_investigation_efficiency`, `rca_mechanism_class`, `rca_timeline_ok`, `rca_signal_coverage`,
`rca_cause_completeness`, `rca_confidence_ok`, `rca_anti_leakage`, `rca_hypothesis_focus`, and
`rca_evidence_quality`. The native input/output/cached-token, latency and tool-call evaluators
add five trace-based scores.

Prompts and the DoorDash constraints suffix are copied verbatim from Deductive's Phase C
Python implementation at `3037d27410fb51710901e99081796644ebf84655`. Six semantic graders
share one cached structured judgment per example; focus and evidence use independent calls.
LLM versions are SHA-256 hashes of their prompt templates. Missing judgments retain null
semantics, including the Python anti-leakage fallback. `goal_pass` is graded `(score - 1) / 4`,
following Python and LangSmith; Phase C's stored binary gate is a known discrepancy.

The acceptance spec verifies every selected key per example, explicit null cost, source IDs,
run metadata, and the agent trace. Scores contain task output and evaluator traces. Full
Agent Builder tracing exports prompts, responses, tool details and real IDs to the profile's
credential-gated cluster. Keep reference and per-example trace links in the PR evidence.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Eval Backend** | The system storing datasets, experiments, scores and traces, such as LangSmith or kbn. |
| **Eval Target** | The product agent being evaluated, such as the Deductive agent or Nightshift Deductive Investigator. |
| **Eval Runner** | The code that loads examples, invokes the target and runs graders, such as the Python golden runner or native Kibana eval suite. |
| **Golden Eval** | A versioned, approved set of examples and graders used for repeatable comparisons. |
| **Trajectory** | The ordered tool calls, tool results and final response supplied to graders as execution evidence. |
| **Harness Parity** | A comparison holding inputs and graders fixed to validate runner/target integration; without equivalent data access, scores are not capability comparisons. |
| **Capability Baseline** | A run in which the Eval Target has the same data access a user would have, so its scores are the first real measurement of investigation quality. There is no minimum score; the number is the deliverable. |
| **Eval Dataset** | The examples (question, reference answer, metadata) stored on an Eval Backend, as opposed to the telemetry a run investigates. |
| **Telemetry Source** | The Elasticsearch cluster the Eval Target queries during a run: the ephemeral Scout cluster for Harness Parity, a remote cluster for a Capability Baseline. |
| **Telemetry Connector** | The preconfigured Kibana stack connector whose URL and credentials the investigator's sandbox receives, one command at a time, to reach the Telemetry Source. |
| **Connector Manifest** | The file written into the sandbox (`/workspace/elastic.md`) describing how to reach the Telemetry Connector: env var names, readable indices and query rules, never secrets. It is Kibana's counterpart of Deductive's per-connector docs. |

## Runner parity contract

These are the ten surfaces in the Phase C design contract.

| Surface | Kibana status |
| --- | --- |
| Dataset | Source read by name; original fields preserved; AND splits; archived rows excluded; source kbn and LangSmith IDs retained. Only the lite dataset is registered. |
| Upload | Approved golden source is never upserted. Native upsert owns only `nightshift/investigate-lite`; no public example snapshot or allowlist upload is introduced. |
| Target input | Manual investigation with question plus verbatim DoorDash suffix. Expected answers remain grader-only. Cortex and persistence are off. |
| Target output | Original 16 fields plus investigation evidence; deterministic report and 2,000-character tool outputs. The unused healthcheck fields stay null. |
| Evaluator input | Original output/reference shapes and prompt text; one shared semantic judge cache. No new server-side evaluator registration. |
| Gate | Original rubric selection and graded `goal_pass`; latency scored separately. Python null, failure and N/A semantics retained. |
| Score keys | All 18 investigate keys plus five native trace metrics. `cost_usd` is explicit null with Deductive's explanation. |
| Experiment | Native UUID, permanent experiment URL, per-example agent task trace and evaluator trace IDs, and task output in score documents. No Postgres integration is added. |
| Run metadata | Reasoning mode, exact suffix, judge, backend, runner, target, Cortex, persistence and dataset recorded in every score's `evaluator.metadata.experiment`; native runner also retains experiment metadata locally. Native git revision/hostname replace Python package/runtime-cluster metadata. The server's closed top-level metadata schema remains a gap. |
| Cost and export | No dollar rollup. Native span export and token metrics use the full Agent Builder trace. Source LangSmith flushing/cost rereads are backend-specific. |

Known server gaps remain: approximately five-second score refresh, HTTP 413 for large score
batches, and the unpaginated 100 MiB dataset read. This lite run stays below those limits.

## Suite layout and synthetic smoke eval

`evals/golden/` follows the suite's types/datasets/task/evaluators/spec pattern and adds prompts,
global setup and pure-module Jest tests. `src/evaluate.ts` provides the shared Playwright fixture.
`evals/smoke/` checks seed loading and score ingestion using `src/seed_data/` utilities.

```bash
NIGHTSHIFT_DATASETS=synthetic-smoke node scripts/evals run --suite nightshift-investigations --profile golden
```

The smoke eval also needs GCS seed credentials. Golden examples are scoring inputs; seed data
are the Elasticsearch documents a target investigates. Golden Harness Parity deliberately
loads no customer seed data. New seeded evals can follow `evals/smoke/` and `withSeedData`;
new unseeded evals can follow `evals/golden/`.

## Remote telemetry Capability Baseline

`evals/remote/` runs the golden task and all 23 graders against a **remote** Telemetry Source:
the investigator's sandbox queries a cluster you connect instead of the empty Scout cluster.
Examples come from a local, labels-only JSON file that is never committed; there are no
telemetry snapshots. This is a Capability Baseline: the first score is the deliverable and there
is no minimum.

Nothing in this repository names a cluster. The operator supplies four things through the
environment, typically from a cluster-specific skill kept in a private repository:

| Variable | Meaning |
| --- | --- |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` | The remote cluster's Elasticsearch URL, reachable from the sandbox container. |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY` | A **read-only** API key for that cluster. The Scout config turns the Telemetry Connector into a header-authenticated webhook (`Authorization: ApiKey …`) and the Connector Manifest switches to `CONNECTOR_SECRET_HEADER_AUTHORIZATION`. |
| `NIGHTSHIFT_SANDBOX_READABLE_INDICES` | Markdown replacing the default readable-index hint in the Connector Manifest: remote-cluster naming, index patterns and useful fields. Load-bearing on clusters with many cross-cluster remotes, where wildcard discovery calls do not return. |
| `NIGHTSHIFT_REMOTE_EXAMPLES_FILE` | Path to the examples file below. |

The examples file validates against the same example contract as the golden eval, with two
differences: `metadata.case_id` may replace `langsmith_example_id`, and the question limit is
computed from the Elastic constraints suffix in [`evals/remote/prompts.ts`](evals/remote/prompts.ts).
That suffix replaces the DoorDash one: it forbids reading the incident or ticket that describes
the problem, restricts evidence to before the incident was detected, and disallows resolution
notes as causes. The `dataset` name must start with `nightshift/`; approved `deductive/*` datasets
are never written.

```json
{
  "dataset": "nightshift/remote-smoke",
  "description": "optional",
  "tags": ["optional"],
  "examples": [
    {
      "input": { "question": "i want you to debug and identify the root cause of \"<alert title>\"\nDetected: <UTC time>\nEnvironment: <cloud/region>" },
      "output": { "reference_answer": "<what actually happened>" },
      "metadata": {
        "case_id": "<stable id>",
        "category": "investigate",
        "max_latency_seconds": 600,
        "dataset_split": ["cluster/<name>", "suite/remote-smoke"],
        "source_url": "<incident link, provenance only>"
      }
    }
  ]
}
```

Set `category: investigate` explicitly: the rubric selector otherwise keys on questions starting
with "Debug this alert". Keep incident links out of the question; the sandbox can only reach
Elasticsearch, and the suffix forbids reading them anyway.

```bash
NIGHTSHIFT_DATASETS=remote \
NIGHTSHIFT_REMOTE_EXAMPLES_FILE=/path/to/examples.json \
NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL=https://<remote-es>:443 \
NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY="$(cat /path/to/read-only-key)" \
NIGHTSHIFT_SANDBOX_READABLE_INDICES="$(cat /path/to/readable-indices.md)" \
node scripts/evals start --suite nightshift-investigations --profile golden \
  --model openrouter-anthropic-claude-sonnet-4-6 \
  --judge openrouter-anthropic-claude-sonnet-4-6
```

The spec upserts the named dataset, runs every example at concurrency 2, and in addition to the
golden acceptance checks requires that each trajectory contains at least one sandbox command
that passed `connector_id` and returned without a tool error, proving the remote cluster was
actually reached. Run metadata records `comparison: Capability Baseline`,
`telemetry_source: remote` and the exact suffix.

To ask the same investigator ad-hoc questions about the remote cluster once the stack is up,
start a manual investigation against the Scout Kibana and poll it:

```bash
curl -s -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  http://localhost:5620/internal/nightshift/investigations \
  -d '{"subject":{"type":"manual"},"message":"<your question>"}'
# → {"investigation_id": "..."}; then
curl -s -u elastic:changeme http://localhost:5620/internal/nightshift/investigations/<id>
```

The Agent Builder UI on the same Kibana lists the conversation under the Deductive
investigator agent.

## Seed data

Seed data comes from snapshots in the `nightshift-datasets` GCS bucket, laid out engine-first so a
suite can scope to a whole engine or narrow to one source:

```
nightshift-datasets/
└── investigation-engine/
    ├── synthetic/            # the smoke eval's snapshot and any other synthetic datasets
    └── customer0/            # labelled incidents
```

`detection-engine/` is reserved at the same level for later capabilities. Elasticsearch reads the
bucket through its own keystore rather than the eval process, which is why the credential has to
be present before the cluster starts; the `evals_tracing` Scout config (the default for eval
suites) handles the wiring.

### Publishing the synthetic snapshot

The smoke eval restores `synthetic-smoke` from `investigation-engine/synthetic`. To create or
refresh it:

```bash
export GCS_CREDENTIALS="$(cat service-account.json)"
node scripts/scout start-server --serverConfigSet evals_tracing
node scripts/publish_nightshift_eval_snapshot.js
```

The script seeds throwaway documents into a data stream, snapshots them to GCS and removes the
local copy. See `--help` for its flags.

Publishing refuses to overwrite a snapshot that already exists, since a snapshot is found by name
and the data it would replace is gone for good. Add `--replace` to refresh one deliberately:

```bash
node scripts/publish_nightshift_eval_snapshot.js --replace
```

Only the document generation in that script is specific to the synthetic dataset. Publishing goes
through [`publishEsSnapshot`](src/seed_data/publish_es_snapshot.ts), which takes an eval dataset's
own `seedSource` and so writes to exactly the location
[`replayEsSnapshot`](src/seed_data/es_snapshot.ts) will read from — the write side cannot drift
away from the read side. A CLI that captures real data should reuse it, along with
[`createEsClient`](scripts/lib/es_client.ts) for reaching a remote cluster:

```ts
await publishEsSnapshot({
  source: myDataset.seedSource,
  indices: ['logs-*', 'metrics-*', 'traces-*'],
  esClient,
  log,
});
```

This needs a service account with **write** access; the credential CI restores with is read-only.
Raising `--document-count` also means raising `SYNTHETIC_SMOKE_DOCUMENT_COUNT` in
[`sources.ts`](src/seed_data/sources.ts), since that constant is the ground truth the eval scores
against.

## Environment and CI

| Variable | Effect |
| --- | --- |
| `NIGHTSHIFT_DATASETS` | Unset, `all` or `investigate-lite` selects the lite golden eval. `synthetic-smoke` selects the seed smoke eval. `remote` selects the remote telemetry Capability Baseline. Unknown values fail early. |
| `SANDBOX_API_KEY` | Required local sandbox-api key, shared by Scout and sandbox-api. |
| `SANDBOX_API_HOST`, `SANDBOX_API_PORT` | Override `localhost:9090`. |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` | Elasticsearch URL reachable inside the sandbox; default `http://host.docker.internal:9220`. |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY` | With the URL, makes the Telemetry Connector a header-authenticated remote cluster connector. |
| `NIGHTSHIFT_SANDBOX_READABLE_INDICES` | Replaces the Connector Manifest's readable-index hint. |
| `NIGHTSHIFT_REMOTE_EXAMPLES_FILE` | Labels-only examples file for the `remote` selector. |
| `NIGHTSHIFT_GOLDEN_SNAPSHOT` | Managed by global setup; temporary source snapshot path. |
| `SELECTED_EVALUATORS` | Standard native filter by evaluator name. Acceptance evidence uses all 23. |
| `GCS_CREDENTIALS` | Needed only for seed snapshots; supplied through profile `gcsDatasetAccessCredentials`. |

Registered as `nightshift-investigations` in
[`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json), with Scout config
`evals_nightshift_investigations`. PR and weekly jobs must provision the same external sandbox
and `SANDBOX_API_KEY`; this suite does not add a sandbox launcher. Existing model group selection
applies. Use `--judge` explicitly for the reference comparison.

Validation:

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-nightshift-investigations
node scripts/check.js --scope=local
```
