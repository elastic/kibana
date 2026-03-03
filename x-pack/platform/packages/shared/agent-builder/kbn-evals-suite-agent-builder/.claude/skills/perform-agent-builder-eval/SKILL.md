---
name: perform-agent-builder-eval
description: Orchestrate agent-builder evaluation runs — init ES/Kibana/EDOT stack, collect eval parameters, output the run command, and stop services.
allowed-tools: Bash, Read
argument-hint: [init|stop]
---

# Perform Agent Builder Evaluation

This skill manages the lifecycle of running agent-builder evaluations. It accepts `$ARGUMENTS` as one of: `init` or `stop`.

- **`init`** — Launch ES, Kibana, and EDOT; collect eval parameters; output the run command
- **`stop`** — Kill background ES, Kibana, and EDOT processes

---

## Action: `init`

Follow these steps sequentially. Each step requires confirmation before proceeding.

### Step 1: Prompt for GCS Credentials

Use `AskUserQuestion` to ask the user for the path to their GCS credentials file. The default path is **exactly** `~/.gcs/gcs.client.default.credentials_file.json` — do NOT suggest any other path (not `~/.config/gcloud/...`, not application_default_credentials, etc.).

> What is the path to your GCS credentials file? (default: ~/.gcs/gcs.client.default.credentials_file.json)

If the user accepts the default or leaves it blank, use `$HOME/.gcs/gcs.client.default.credentials_file.json` (expand `~` to the user's home directory). Validate that the resolved path starts with `/`. If it does not, ask again.

### Step 2: Launch Elasticsearch

Launch Elasticsearch in the background using `run_in_background`. Include the GCS credentials:

```bash
yarn es snapshot --license trial --secure-files gcs.client.default.credentials_file=<GCS_CREDENTIALS_PATH>
```

Tell the user Elasticsearch is starting up.

### Step 3: Register GCS Snapshot Repository

Wait for Elasticsearch to become available by polling until the cluster health endpoint responds:

```bash
until curl -s -u elastic:changeme http://localhost:9200/_cluster/health | grep -q '"status"'; do sleep 5; done
```

Once ES is ready, register the GCS snapshot repository with these defaults:

- **Repository name**: `agent-builder-datasets`
- **Bucket**: `agent-builder-datasets`
- **Base path**: `knowledge_base/snapshot_dt=2026-01-10`

```bash
curl -s -u elastic:changeme -X PUT "http://localhost:9200/_snapshot/agent-builder-datasets" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "gcs",
    "settings": {
      "bucket": "agent-builder-datasets",
      "base_path": "knowledge_base/snapshot_dt=2026-01-10"
    }
  }'
```

Verify registration succeeded by checking the response contains `"acknowledged":true`. If it fails, show the error to the user and ask if they want to retry or abort.

Tell the user the GCS snapshot repository has been registered.

### Step 4: Restore a Snapshot

List available snapshots in the repository:

```bash
curl -s -u elastic:changeme "http://localhost:9200/_snapshot/agent-builder-datasets/_all"
```

Parse the response and present each snapshot as an option using `AskUserQuestion`. For each snapshot, show:
- **Label**: the snapshot name
- **Description**: number of indices and the snapshot date

Example options:
- `manual_test_snapshot_2` — 32 indices, Jan 12
- `text_retrieval_eval_bm25_elser` — 2 indices, Feb 12

Once the user selects a snapshot, restore it:

```bash
curl -s -u elastic:changeme -X POST "http://localhost:9200/_snapshot/agent-builder-datasets/<snapshot_name>/_restore" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "*",
    "include_global_state": false
  }'
```

Verify the restore was accepted by checking the response contains `"accepted":true`. If it fails (e.g., index already exists), show the error and ask the user if they want to close conflicting indices and retry, or abort.

To retry with conflicting indices closed:

```bash
curl -s -u elastic:changeme -X POST "http://localhost:9200/<comma_separated_index_names>/_close"
```

Then re-run the restore command.

Tell the user the snapshot has been restored.

### Step 5: Launch Kibana

Launch Kibana in the background using `run_in_background`:

```bash
yarn start --no-base-path
```

Tell the user Kibana is starting up.

### Step 6: Confirm Phoenix Running

Use `AskUserQuestion` to confirm Phoenix is running:

> Is Phoenix running and ready to receive traces?

Options:
- **Yes** — Continue
- **Not yet** — Wait for the user to start Phoenix, then ask again

### Step 7: Launch EDOT

Launch the EDOT collector in the background using `run_in_background`:

```bash
ELASTICSEARCH_HOST=http://localhost:9200 ELASTICSEARCH_USERNAME=elastic ELASTICSEARCH_PASSWORD=changeme node scripts/edot_collector.js
```

Tell the user EDOT is starting up.

### Step 8: Collect Eval Parameters and Output Run Command

#### 8a: Discover available connectors

Read `config/kibana.dev.yml` and parse the `xpack.actions.preconfigured` section to get the list of available connector IDs and names. These connectors are used for both `EVALUATION_CONNECTOR_ID` (the judge) and `--project` (the model being evaluated).

If no connectors are found, tell the user to configure connectors in `config/kibana.dev.yml` under `xpack.actions.preconfigured` and abort.

#### 8b: Select evaluation connector (judge)

Use `AskUserQuestion` to ask which connector to use as the evaluation judge. Present the discovered connectors as options:

> Which connector should be used as the evaluation judge (EVALUATION_CONNECTOR_ID)?

Options: one per discovered connector, using `id (name)` as the label.

#### 8c: Select project (model to evaluate)

Use `AskUserQuestion` to ask which connector/model to evaluate. Present the discovered connectors as options:

> Which model should be evaluated (--project)?

Options: one per discovered connector, using `id (name)` as the label.

#### 8d: Select dataset

Use `AskUserQuestion` to ask which dataset to use:

> Which dataset should be used?

Options:
- `agent-builder: text-retrieval: wix-qa`
- `agent-builder: text-retrieval: elastic-qa`
- `agent-builder: text-retrieval: quick-tester`

#### 8e: Output the run command

Using the collected values and the following defaults, output the exact command the user should run in a separate terminal:

- **SELECTED_EVALUATORS**: `Precision@K,Recall@K,F1@K,Latency,Input Tokens,Output Tokens,Tool Calls,Factuality,Groundedness,Relevance`
- **RAG_EVAL_K**: `10,20,30,40`
- **EVALUATION_REPETITIONS**: `1`

Display a summary and the command:

> **Stack is ready!**
>
> - Elasticsearch: running (snapshot with GCS credentials)
> - Kibana: running (no base path)
> - Phoenix: confirmed running
> - EDOT: running
>
> **Important:** Make sure Cloud Connected Mode (CCM) is enabled in Kibana before running the evaluation. Go to **Stack Management > Cloud Connected Mode** in the Kibana UI and enable it if it is not already active.
>
> **Run the following command in a separate terminal to start the evaluation:**
>
> ```bash
> TRACING_ES_URL=http://elastic:changeme@localhost:9200 \
> SELECTED_EVALUATORS="<value>" \
> RAG_EVAL_K=<value> \
> KBN_EVALS_EXECUTOR=phoenix \
> EVALUATION_CONNECTOR_ID=<value> \
> DATASET_NAME="<value>" \
> EVALUATION_REPETITIONS=<value> \
> KBN_EVALS_SKIP_CONNECTOR_SETUP=true \
> node scripts/playwright test \
>   --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts \
>   evals/external/external_dataset.spec.ts \
>   --project <value>
> ```

Substitute the actual user-selected values into the command. The user will copy-paste and run this themselves. Do NOT append any extra notes or warnings after the command block.

---

## Action: `stop`

Kill background ES, Kibana, and EDOT processes that were launched during `init`.

### Step 1: Kill Processes

Run the following commands to find and kill the relevant processes:

```bash
# Kill Elasticsearch
pkill -f 'elasticsearch' || true

# Kill Kibana (node process started by yarn start)
pkill -f 'scripts/kibana --dev' || true

# Kill EDOT collector
pkill -f 'edot_collector' || true
```

### Step 2: Confirm

Tell the user:

> All evaluation stack processes (ES, Kibana, EDOT) have been stopped.

---

## Important Notes

- **Background processes**: ES, Kibana, and EDOT are launched with `run_in_background`. Their task IDs are tracked by the session so `stop` can kill them.
- **Hard-coded values**: `TRACING_ES_URL`, `KBN_EVALS_EXECUTOR`, and `KBN_EVALS_SKIP_CONNECTOR_SETUP` are not configurable — they are set for the local dev stack.
- **Always use `node scripts/playwright test`** — never use `npx playwright test`.
- **Playwright config**: Always uses `x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts`.
- **Test spec**: Always runs `evals/external/external_dataset.spec.ts`.
