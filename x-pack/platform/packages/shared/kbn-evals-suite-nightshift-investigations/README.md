# @kbn/evals-suite-nightshift-investigations

Evaluation suite for [Nightshift investigations](../../../plugins/shared/nightshift_investigations).

The default smoke eval checks seed data loading and score ingestion. An explicitly selected
trace-only eval runs the real manual investigation workflow on file-based questions and persists
its report, conversation and full agent trace. Its single placeholder score is **ungraded**; it
does not measure investigation quality or establish execution success.

## Running the suite

```bash
node scripts/evals start --suite nightshift-investigations
```

`start` brings up Elasticsearch, Kibana and EDOT, then runs the suite. Later runs reuse those
services, so iteration is fast. Use `node scripts/evals run --suite nightshift-investigations`
when they are already up.

### Choosing where scores are recorded

The `--profile` flag decides which cluster records the run. Refer to [`--profile` in the `@kbn/evals` README](../kbn-evals/README.md#profiles) for the full list of profiles and how each one resolves its credentials. The two that matter most here:

| Goal                                 | Command                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Keep scores on your own machine      | `node scripts/evals start --suite nightshift-investigations --profile local`     |
| Publish scores to the golden cluster | `node scripts/evals start --suite nightshift-investigations --profile dev-vault` |

`dev-vault` publishes to the golden cluster, which is what the weekly pipeline writes to and what the dashboards read, so use it when a run needs to be comparable against the weekly baseline. It reads its credentials from Vault at runtime, handling the login itself and opening a browser if your Vault session has expired.

`local` records scores on your own development Elasticsearch and Kibana, so start those yourself before running the suite. Both stay in the foreground, so each needs its own terminal, and the suite then runs in a third:

```bash
# terminal 1
yarn es snapshot --license trial   # Elasticsearch on localhost:9200

# terminal 2
yarn start                         # Kibana on localhost:5601
```

`start` will not launch them for you. It brings up a separate Scout cluster on `9220` and `5620` for the suite to run against, and leaves your development instance alone. Omitting `--profile` prompts for a destination instead.

Either way the profile also supplies this suite's `GCS_CREDENTIALS`, read from `gcsDatasetAccessCredentials` in the profile's config — from Vault for `dev-vault`, from `config.<profile>.json` otherwise, and `node scripts/evals init` can fill it in. Export the variable by hand only when running outside a profile, as [publishing](#publishing-the-synthetic-snapshot) does.

For model and judge selection, `--grep` and repetitions, see [running evals locally](../kbn-evals/README.md#11-getting-started-locally). This suite does not override any of those flags.

## Trace-only investigations

Start an external sandbox-api and its Docker backend before running this selection. Supply
`SANDBOX_API_KEY`, `SANDBOX_CLIENT_CERT_PATH` and `SANDBOX_CLIENT_KEY_PATH`; for a private CA also
supply `SANDBOX_CA_CERT_PATH`. `SANDBOX_API_HOST` and `SANDBOX_API_PORT` default to `localhost:9090`
(the probe port is not the gRPC endpoint). The sandbox must accept these client certificates and
allow sandbox-api to reach its containers. Leave sandbox-service's `WORKSPACE_SNAPSHOT_*`
settings unset for isolated conversations. Provisioning the sandbox is a separate follow-up.

Use an existing evaluations profile with a model endpoint and a results/trace destination:

```bash
node scripts/evals stop
NIGHTSHIFT_DATASETS=trace-only node scripts/evals start \
  --suite nightshift-investigations --profile golden \
  --model openrouter-anthropic-claude-sonnet-4-6 \
  --judge openrouter-anthropic-claude-sonnet-4-6
```

The native framework still requires an evaluation endpoint in its configuration; the command
reuses the target endpoint for that metadata. This suite never invokes an LLM evaluator or judge.
The CODE evaluator `ungraded_placeholder` always returns one, uses neutral direction, and states
that no quality evaluation was performed. Execution errors, missing reports, incomplete traces, missing
examples or missing persisted scores fail independent acceptance checks even if that score is one.
Recovered tool errors remain visible in the evidence. Trace acceptance checks their complete
payloads, including model calls rejected by schema validation before tool execution.
The bundled synthetic cases also require a successful sandbox command (exit code zero), so an
unavailable sandbox cannot pass acceptance. The calculation output and investigation answer stay
ungraded; this fixture-specific execution check does not apply to custom dataset files.

The default [synthetic file](evals/investigation/synthetic.json) contains two public fictional
incidents. Their questions contain all evidence and request a sandbox calculation, so no telemetry
connector, Elasticsearch identity, customer dataset, reference answer or snapshot is required.
The selected model runs the product manual-investigation route; the runner polls its status and
reads the saved report and conversation. Raw conversation rounds and tool arguments/results are
retained without grader-specific formatting or truncation. Each persisted score links the agent's
conversation trace; the placeholder has a separate evaluator trace.

The `evals_nightshift_investigations` server config extends `evals_tracing` only for `trace-only`.
It enables the investigation engine, its `streams.significantEventsAvailable` feature flag and
sandbox, disables Cortex, and exports full Agent Builder
payloads (user messages, system instructions, responses, tool arguments/results and conversation
IDs) to the profile's configured destination. Sandbox credentials, PEM material and trace-exporter
headers are passed in an owner-only temporary config, removed on exit and termination signals.
Full payloads have the destination's access controls; use synthetic questions or data you are
allowed to export there. Existing sandbox connector authorization remains unchanged.

To run another file with the same loader and task:

```bash
NIGHTSHIFT_DATASETS=trace-only NIGHTSHIFT_EXAMPLES_FILE=/absolute/path/examples.json \
  node scripts/evals run --suite nightshift-investigations --profile golden \
  --model openrouter-anthropic-claude-sonnet-4-6 --judge openrouter-anthropic-claude-sonnet-4-6
```

```json
{
  "dataset": "nightshift/my-traces",
  "examples": [
    {
      "input": { "question": "Investigate this fictional incident using the evidence supplied here..." },
      "metadata": { "case_id": "synthetic-incident-1" }
    }
  ]
}
```

The file must contain 1–1,000 examples with distinct nonempty `metadata.case_id` values and
nonempty questions within the product's 10,000-character limit. Dataset names must start with
`nightshift/`; the native executor upserts this owned dataset. Optional `output` labels, additional
input/metadata fields, file `description` and `tags` are preserved. Questions alone reach the
investigator; labels and metadata do not. `NIGHTSHIFT_EXAMPLES_FILE` defaults to the committed
synthetic fixture. No golden-source derivation or LangSmith identifier is needed.
Tags must satisfy the shared dataset API schema, including its 64-character limit and 20-tag
total after adding the required `nightshift` and `ungraded` tags.

Acceptance verifies expected example/repetition coverage, one persisted placeholder per run,
completed investigations, saved report/conversation identifiers, complete linked agent traces,
and no LLM calls in the evaluator traces. The terminal prints experiment, dataset, case,
investigation, conversation and trace IDs for sharing. Inspect them in the evaluations UI under
`/app/management/ai/evals/experiments/<experiment-id>`; per-example links add
`?dataset_id=<dataset-id>&example_id=<example-index>&trace_id=<agent-trace-id>`.
Historical full-grader runs are not acceptance evidence for this runner. Graders, native trace
metrics, automatic provisioning and generalized CI defaults are deferred.

Stop and restart the managed stack before switching between smoke and trace-only selections,
changing any `SANDBOX_*` variable, or changing certificate/key file contents. The native CLI caches
Scout by config-set name and does not detect those startup inputs; automatic freshness detection
is a separate follow-up. Use `evals run` to repeat a run with unchanged startup settings. Plain
`start` and CI keep the original smoke selection and `evals_tracing` behavior, without requiring
sandbox credentials.

## Two kinds of dataset

The word "dataset" means two different things in evals, and this suite keeps them apart deliberately. It is worth reading once.

| Term             | What it is                                                                                                                                  | Where it lives                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Eval dataset** | The examples a run is scored on: an input, the expected output, and metadata. Scores are recorded against it.                               | [`src/datasets/`](src/datasets)   |
| **Seed data**    | The Elasticsearch documents an eval dataset is evaluated _against_ — logs, metrics, traces, alerts. Restored into the cluster before a run. | [`src/seed_data/`](src/seed_data) |

An eval dataset names its seed data through `seedSource`, but the two are otherwise independent: several eval datasets can sit on top of the same seed data, and swapping the target under test changes neither. That is what lets one eval dataset and its evaluators be reused against a different target.

## Layout

One eval is one folder under `evals/`, holding everything specific to it. `src/` holds only what
every eval shares.

| Path              | Holds                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `evals/<name>/`   | One eval: its datasets, task, evaluators, types and spec                 |
| `src/datasets/`   | The eval dataset contract, selection, and conversion to framework shape  |
| `src/seed_data/`  | Seed sources, plus seeding, publishing and clearing them                 |
| `src/evaluate.ts` | The suite's Playwright fixture                                           |
| `scripts/lib/`    | Code shared between the CLIs, such as connecting to a cluster from flags |
| `scripts/<name>/` | One developer CLI each, run via a launcher in Kibana's root `scripts/`   |

Inside an eval folder the files always mean the same thing, so `evals/smoke/` reads as a template:

| File            | Holds                                                              |
| --------------- | ------------------------------------------------------------------ |
| `types.ts`      | The example shape, its expected output, and the evaluator type     |
| `datasets.ts`   | The eval datasets and a `get<Name>Datasets()` that applies filters |
| `task.ts`       | What runs under test, and the shape of its output                  |
| `evaluators.ts` | The evaluators, and the array the spec passes to the runner        |
| `*.spec.ts`     | Wiring: iterate datasets, seed, run, score                         |

Playwright only collects `*.spec.ts`, so the neighbouring files are invisible to it while Jest
still picks up `*.test.ts`.

Specs stay thin because [`withSeedData`](src/seed_data/with_seed_data.ts) registers both the `beforeAll` that seeds and the `afterAll` that clears, so no spec carries its own copy and none can forget cleanup:

```ts
evaluate.describe(dataset.id, () => {
  const seedData = withSeedData(dataset);

  evaluate('...', async ({ esClient }) => {
    // seedData().indices — the data streams seeding actually wrote
  });
});
```

## Adding a new eval

For seeded evals, follow [`evals/smoke/`](evals/smoke). For file-driven investigations, follow
[`evals/investigation/`](evals/investigation). Include new selections explicitly in
`playwright.config.ts` so sandbox-dependent specs do not silently enter smoke CI.

1. **`types.ts`** — describe an example: its input, the expected output your evaluators will read,
   and an evaluator type bound to your task's output.
2. **`task.ts`** — call the thing under test and return a typed result. For the investigation
   engine that means `POST /internal/nightshift/investigations` through the `fetch` fixture, then
   following the investigation to a terminal status.
3. **`datasets.ts`** — declare `Dataset` objects with an `id`, a `name` that scores are recorded
   against, a `seedSource`, and an `examples()` call returning ground truth. Export a
   `get<Name>Datasets()` that passes them through `selectDatasets`, which is what makes
   `NIGHTSHIFT_DATASETS` work for your eval too.
4. **`evaluators.ts`** — write CODE evaluators as plain objects, and reach for the `evaluators`
   fixture for LLM-as-judge scoring (`evaluators.criteria([...])`). Export them as one array.
5. **`<name>.spec.ts`** — iterate your datasets, call `withSeedData(dataset)` once per describe
   block, and hand the task and evaluators to `executorClient.runExperiment`.

Two details worth knowing before you start:

- **Seed data belongs in [`src/seed_data/sources.ts`](src/seed_data/sources.ts), not in your eval
  folder.** Several evals can share one snapshot, and the CLI that publishes it has to agree with
  the eval that reads it, so each source is declared once and referenced by both.
- **`examples` is a function, not an array.** It is called when Playwright collects the describe
  tree, which is what a dataset reading ground truth from files downloaded during global setup
  needs.

If your eval needs data from somewhere other than a GCS snapshot, add a member to `SeedSource` in
[`src/seed_data/types.ts`](src/seed_data/types.ts) and a branch to `seedDataset` in
[`src/seed_data/seed.ts`](src/seed_data/seed.ts). That switch is the only place seeding fans out.

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

## Environment variables

| Variable              | Effect                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NIGHTSHIFT_DATASETS` | Unset, `all` or `synthetic-smoke` runs the seed smoke eval. `trace-only` runs file-driven investigations. Unknown values fail early. |
| `SELECTED_EVALUATORS` | Standard `@kbn/evals` filter, by evaluator name (`documents_restored`, `timestamps_replayed`).                                                    |
| `GCS_CREDENTIALS`     | Service account JSON Elasticsearch uses to reach the seed-data bucket. Read access is enough to run the suite.                                    |

Because every eval dataset gets its own `describe` block, Playwright's `--grep` filters by dataset id as well.

```bash
NIGHTSHIFT_DATASETS=synthetic-smoke node scripts/evals run --suite nightshift-investigations
```

## CI

Registered in [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json)
as `nightshift-investigations`.

- **On a PR:** add the `evals:nightshift-investigations` label. No `models:` label is needed —
  the suite pins a cheap connector through `defaultModelGroups`, and since no model affects the
  smoke eval's score, which one runs does not matter.
- **Weekly:** a step in [`llm_evals.yml`](../../../../../.buildkite/pipelines/evals/llm_evals.yml)
  runs it against that same connector.
- **Failures** are posted to `#nightshift-alerts`, resolved from `slackChannel` in the suite entry.
- **Scores** reach the golden cluster automatically, through `EVAL_KBN_URL` in CI.

## Validation

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-nightshift-investigations
node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-nightshift-investigations/tsconfig.json
node scripts/check.js --scope=local
```

The native trace-only run above is the end-to-end acceptance seam. Unit tests cover malformed
datasets and task failures, including preserving partial evidence when workflow details fail.
