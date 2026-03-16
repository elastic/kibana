---
name: perform-agent-builder-eval
description: Orchestrate agent-builder evaluation runs — init ES/Kibana/EDOT stack, run evaluations, and stop services.
allowed-tools: Bash, Read
argument-hint: [init|run|stop]
---

# Perform Agent Builder Evaluation

This skill manages the lifecycle of running agent-builder evaluations. It accepts `$ARGUMENTS` as one of: `init`, `run`, or `stop`.

- **`init`** — Launch ES, Kibana, EDOT, and Phoenix; restore snapshot data
- **`run`** — Select parameters and execute evaluation jobs (requires `init` to have been run first)
- **`stop`** — Kill background ES, Kibana, and EDOT processes

---

## Action: `init`

Follow these steps sequentially.

### Step 1: Preflight Checks

Run all preflight checks before launching any services. This catches problems early and avoids wasted time.

#### 1a: Resolve GCS Credentials

The default GCS credentials path is **exactly** `$HOME/.gcs/gcs.client.default.credentials_file.json`.

Check whether the default file exists (use Bash: `test -f "$HOME/.gcs/gcs.client.default.credentials_file.json"`).

- **If it exists**: use it automatically and tell the user which path was detected. Do NOT prompt.
- **If it does not exist**: use `AskUserQuestion` to ask the user for the path. Do NOT suggest any path other than the default (not `~/.config/gcloud/...`, not application_default_credentials, etc.). Validate that the provided path starts with `/` and the file exists. If not, ask again.

#### 1b: Validate Vault Token

Check that the user has a valid Vault token before proceeding:

```bash
vault token lookup -format=json 2>/dev/null | grep -q '"id"'
```

- **If valid**: tell the user Vault token is OK and continue.
- **If invalid or expired**: tell the user to authenticate with `vault login --method oidc` (and connect to VPN if needed). Wait for them to confirm, then re-check.

#### 1c: Detect Kibana

Check if Kibana is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status 2>/dev/null
```

- **If it responds (any 2xx/3xx/401)**: note that Kibana is already running. Do NOT launch it later.
- **If it does not respond**: note that Kibana will need to be launched.

#### 1d: Detect Phoenix

Check if Phoenix is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:6006 2>/dev/null
```

- **If it responds (any 2xx/3xx)**: note that Phoenix is already running. Do NOT prompt later.
- **If it does not respond**: note that Phoenix is not running. The user will be prompted later.

### Step 2: Launch Elasticsearch

Launch Elasticsearch in the background using `run_in_background`. Include the GCS credentials:

```bash
yarn es snapshot --license trial --secure-files gcs.client.default.credentials_file=<GCS_CREDENTIALS_PATH> -E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud
```

Tell the user Elasticsearch is starting up.

### Step 3: Set Up EIS and Register GCS Snapshot Repository

Wait for Elasticsearch to become available by polling until the cluster health endpoint responds. Fail after 30 attempts (approximately 2.5 minutes):

```bash
MAX_RETRIES=30; COUNT=0; until curl -s -u elastic:changeme http://localhost:9200/_cluster/health | grep -q '"status"'; do COUNT=$((COUNT+1)); if [ "$COUNT" -ge "$MAX_RETRIES" ]; then echo "ERROR: Elasticsearch did not become available after $MAX_RETRIES attempts"; exit 1; fi; sleep 5; done
```

If the poll times out, show the error to the user and suggest checking the Elasticsearch background task output for startup errors.

Once ES is ready, run the EIS setup script to configure Cloud Connected Mode (CCM):

```bash
node scripts/eis.js
```

Verify it succeeds by checking for the "EIS API key successfully set" message. If it fails, show the error to the user.

Tell the user EIS/CCM has been configured.

Next, register the GCS snapshot repository with these defaults:

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

### Step 5: Launch Kibana (if needed)

If Step 1c detected Kibana is already running, skip this step and tell the user Kibana was detected as already running.

Otherwise, launch Kibana in the background using `run_in_background`:

```bash
yarn start --no-base-path
```

Tell the user Kibana is starting up.

### Step 6: Confirm Phoenix Running (if needed)

If Step 1d detected Phoenix is already running, skip this step and tell the user Phoenix was detected as already running.

Otherwise, use `AskUserQuestion` to tell the user Phoenix is not running:

> Phoenix is not running on localhost:6006. Please start it, then let me know.

Options:
- **It's running now** — Continue
- **Not yet** — Wait for the user to start Phoenix, then re-check with a curl

### Step 7: Launch EDOT

Launch the EDOT collector in the background using `run_in_background`:

```bash
ELASTICSEARCH_HOST=http://localhost:9200 ELASTICSEARCH_USERNAME=elastic ELASTICSEARCH_PASSWORD=changeme node scripts/edot_collector.js
```

Tell the user EDOT is starting up.

### Step 8: Confirm Ready

Tell the user:

> **Stack is ready!**
>
> - Elasticsearch: running (snapshot restored)
> - Kibana: running
> - Phoenix: running
> - EDOT: running
>
> Use `/perform-agent-builder-eval run` to start evaluation jobs.

---

## Action: `run`

This action collects evaluation parameters and executes evaluation jobs. It requires the stack to already be running (via `init`).

### Step 1: Verify Stack is Running

Quickly check that ES and Kibana are reachable:

```bash
curl -s -u elastic:changeme http://localhost:9200/_cluster/health | grep -q '"status"'
curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status 2>/dev/null
```

If either is unreachable, tell the user to run `/perform-agent-builder-eval init` first and stop.

### Step 2: Discover Available Connectors

Read `config/kibana.dev.yml` and parse the `xpack.actions.preconfigured` section to get the list of available connector IDs and names. These connectors are used for both `EVALUATION_CONNECTOR_ID` (the judge) and `--project` (the model being evaluated).

If no connectors are found, tell the user to configure connectors in `config/kibana.dev.yml` under `xpack.actions.preconfigured` and abort.

### Step 3: Collect Parameters

Use a single `AskUserQuestion` call with **3 questions**:

1. **Judge** (header: "Judge"): "Which connector should be used as the evaluation judge (EVALUATION_CONNECTOR_ID)?"
   - Options: one per discovered connector, using `id (name)` as the label.
2. **Model** (header: "Model"): "Which model should be evaluated (--project)?"
   - Options: one per discovered connector, using `id (name)` as the label.
3. **Datasets** (header: "Datasets", **multiSelect: true**): "Which datasets should be evaluated in parallel?"
   - Options:
     - `agent-builder: text-retrieval: wix-qa`
     - `agent-builder: text-retrieval: elastic-qa`
     - `agent-builder: text-retrieval: quick-tester`

Then use a second `AskUserQuestion` to ask how many iterations:

> How many iterations should each dataset be run? Each iteration produces a separate run ID.

Options:
- **1** — Single run per dataset
- **2** — Two runs per dataset
- **3** — Three runs per dataset

### Step 4: Execute Evaluations

For each iteration (1 to N):

1. Launch **one background job per selected dataset** in parallel using `run_in_background`. Each job runs:

```bash
TRACING_ES_URL=http://elastic:changeme@localhost:9200 \
SELECTED_EVALUATORS="Precision@K,Recall@K,F1@K,Latency,Input Tokens,Output Tokens,Tool Calls,Factuality,Groundedness,Relevance" \
RAG_EVAL_K=10,20,30,40 \
KBN_EVALS_EXECUTOR=phoenix \
EVALUATION_CONNECTOR_ID=<judge> \
DATASET_NAME="<dataset>" \
EVALUATION_REPETITIONS=1 \
KBN_EVALS_SKIP_CONNECTOR_SETUP=true \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts \
  evals/external/external_dataset.spec.ts \
  --project <model>
```

2. Wait for **all parallel jobs in this iteration** to complete.
3. For each completed job, read its output file and extract the `run_id` from the log line matching:
   ```
   info [scout-worker] You can query the data using: environment.hostname:"..." AND task.model.id:"..." AND run_id:"<RUN_ID>"
   ```
   Use a grep/regex to extract the `run_id` value from the quotes.
4. If a job **failed** (non-zero exit code or no `run_id` found): record the error, display all successfully collected run IDs so far, report which dataset(s) failed, and **stop** — do not start the next iteration.
5. If all jobs succeeded, tell the user which iteration completed and proceed to the next iteration.

### Step 5: Display Results

After all iterations complete (or after an error), display a summary table:

> **Evaluation runs complete!**
>
> | Dataset | Iteration | Run ID |
> |---------|-----------|--------|
> | wix-qa  | 1         | `abc123` |
> | wix-qa  | 2         | `def456` |
> | elastic-qa | 1      | `ghi789` |
> | elastic-qa | 2      | `jkl012` |

If any runs failed, add a note below the table listing which dataset/iteration failed and the error message.

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
