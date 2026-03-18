---
name: perform-agent-builder-eval
description: Orchestrate agent-builder evaluation runs — init ES/Kibana/EDOT stack, run evaluations, sweep parameter variants, and stop services.
allowed-tools: Bash, Read, Edit
argument-hint: [init|run|sweep|stop]
---

# Perform Agent Builder Evaluation

This skill manages the lifecycle of running agent-builder evaluations. It accepts `$ARGUMENTS` as one of: `init`, `run`, `sweep`, or `stop`.

- **`init`** — Launch ES, Kibana, EDOT, and Phoenix; restore snapshot data
- **`run`** — Select parameters and execute evaluation jobs (requires `init` to have been run first)
- **`sweep`** — Run evaluations across multiple values of a code parameter, with automatic file edits and Kibana reload between variants
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
- **If invalid or expired**: tell the user to authenticate with `vault login --method oidc`. VPN is not required. Wait for them to confirm, then re-check.

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

Use `AskUserQuestion` with **2 questions**:

1. **Judge** (header: "Judge"): "Which connector should be used as the evaluation judge (EVALUATION_CONNECTOR_ID)?"
   - Options: one per discovered connector, using `id (name)` as the label.
2. **Model** (header: "Model"): "Which model should be evaluated (--project)?"
   - Options: one per discovered connector, using `id (name)` as the label.

Then use a second `AskUserQuestion` (free-text via "Other") to ask for datasets:

> Which datasets should be evaluated in parallel? Enter dataset names separated by commas.
>
> Common datasets: `agent-builder: text-retrieval: wix-qa`, `agent-builder: text-retrieval: elastic-qa`, `agent-builder: text-retrieval: quick-tester`

The user may enter any dataset name — do not restrict to the examples above.

Then use a third `AskUserQuestion` to ask how many iterations:

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

## Action: `sweep`

Run evaluations across named variant sets, where each variant can change one or more parameters across one or more files. The skill applies all edits for a variant, waits for Kibana to reload, runs evaluations, then moves to the next variant. Requires the stack to already be running (via `init`).

### Step 1: Verify Stack is Running

Same check as `run` Step 1 — verify ES and Kibana are reachable. If not, tell the user to run `init` first.

### Step 2: Discover Connectors

Same as `run` Step 2 — read `config/kibana.dev.yml` and parse preconfigured connectors.

### Step 3: Collect Sweep Parameters

Use `AskUserQuestion` with **2 questions**:

1. **Judge** (header: "Judge"): "Which connector should be used as the evaluation judge?"
   - Options: one per discovered connector, using `id (name)` as the label.
2. **Model** (header: "Model"): "Which model should be evaluated?"
   - Options: one per discovered connector, using `id (name)` as the label.

Then use a second `AskUserQuestion` (free-text via "Other") to ask for datasets:

> Which datasets should be evaluated in parallel? Enter dataset names separated by commas.
>
> Common datasets: `agent-builder: text-retrieval: wix-qa`, `agent-builder: text-retrieval: elastic-qa`, `agent-builder: text-retrieval: quick-tester`

The user may enter any dataset name — do not restrict to the examples above.

Then use a third `AskUserQuestion` to ask how many iterations:

> How many iterations per variant? Each iteration produces a separate run ID.

Options:
- **1** — Single run per variant per dataset
- **2** — Two runs per variant per dataset
- **3** — Three runs per variant per dataset

### Step 4: Collect Variant Definitions

Use `AskUserQuestion` (free-text via "Other") to ask:

> Define your variants. Two formats are supported:
>
> **Format A — Cartesian product (shorthand):**
> List parameters with multiple values separated by commas. All combinations are generated automatically.
> ```
> file.ts#param1=val1,val2 x file.ts#param2=valA,valB
> ```
> This produces 4 variants: `(val1, valA)`, `(val1, valB)`, `(val2, valA)`, `(val2, valB)`.
> Variant names are auto-generated from the values (e.g., `val1-valA`).
>
> **Format B — Named variant sets (explicit):**
> Define each variant explicitly, one per line:
> ```
> variant-name: file.ts#param1=value, file.ts#param2=value
> ```
>
> Examples:
> ```
> perform_match_search.ts#rerankInferenceID='.jina-v3','.jina-v2-base-multilingual' x perform_match_search.ts#rankWindowSize=20,30,40
> ```
> or:
> ```
> jina-v3-ws20: perform_match_search.ts#rerankInferenceID='.jina-v3', perform_match_search.ts#rankWindowSize=20
> jina-v2-ws40: perform_match_search.ts#rerankInferenceID='.jina-v2-base-multilingual', perform_match_search.ts#rankWindowSize=40
> ```

**Parsing rules:**

- **Format A** (detected by the presence of ` x ` between parameter groups):
  1. Split on ` x ` to get parameter groups.
  2. Each group is `file.ts#paramName=val1,val2,...` — split values on commas.
  3. Compute the cartesian product of all groups.
  4. Auto-generate variant names by joining the short values with `-` (e.g., `.jina-v3-20`, `.jina-v2-base-multilingual-40`). Use the last path segment of the value for readability (e.g., `jina-v3` instead of `.jina-reranker-v3`).

- **Format B** (detected by `variant-name:` prefix on lines):
  1. Each line defines one variant.
  2. Parse `name: file#param=value, file#param=value`.

For each file path: resolve to an absolute path. If the user gives a filename without a full path, search for it under the repo root.

### Step 5: Read Files and Record Original Values

For each unique file referenced across all variants:
1. Read the file.
2. For each parameter referenced in that file, find the line where it is defined (e.g., `const rankWindowSize = 40;`).
3. Record the **exact line content** and the **current value**.

These original values are used to restore the files at the end.

### Step 6: Confirm the Plan

Present the full plan to the user before starting:

> **Sweep plan:**
>
> | Variant | Changes |
> |---------|---------|
> | baseline | `rankWindowSize=40`, `rerankInferenceID='.jina-reranker-v2-base-multilingual'` |
> | jina-v2-ws20 | `rankWindowSize=20`, `rerankInferenceID='.jina-reranker-v2-base-multilingual'` |
> | cohere-ws40 | `rankWindowSize=40`, `rerankInferenceID='.cohere-rerank-v3'` |
> | cohere-ws80 | `rankWindowSize=80`, `rerankInferenceID='.cohere-rerank-v3'` |
>
> - Datasets: wix-qa, elastic-qa
> - Iterations per variant: 2
> - Total eval jobs: 4 variants x 2 datasets x 2 iterations = 16
>
> Proceed?

Options:
- **Yes** — Start the sweep
- **No** — Abort

### Step 7: Execute Sweep

For each variant in order:

1. **Apply all parameter changes** for this variant using the `Edit` tool. For each `{file, parameter, value}` in the variant, edit the line to set the new value. Track the current line content for each parameter so subsequent edits find the right text.

2. **Wait for Kibana to reload.** Poll until Kibana is available:
   ```bash
   MAX_RETRIES=24; COUNT=0; until curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status 2>/dev/null | grep -qE "^(200|401)"; do COUNT=$((COUNT+1)); if [ "$COUNT" -ge "$MAX_RETRIES" ]; then echo "ERROR: Kibana did not become available after reload"; exit 1; fi; sleep 5; done
   ```
   This polls every 5 seconds for up to 2 minutes.

3. **Run evaluations** for this variant — same as `run` Step 4 (launch all datasets in parallel for N iterations, extract run IDs). Record each run ID tagged with the variant name.

4. If any job **failed**: record the error, display all collected results so far, and **stop** — do not proceed to the next variant. Still restore original values (Step 8).

5. Tell the user which variant completed and move to the next.

### Step 8: Restore Original Values

After all variants are done (or after an error), restore **every parameter** in **every file** to its original value from Step 5 using the `Edit` tool. Wait for Kibana to reload.

This ensures the working tree is left in its original state regardless of whether the sweep completed or was interrupted by an error.

### Step 9: Display Results

Display a summary table with the variant column:

> **Sweep complete!**
>
> | Variant      | Dataset    | Iteration | Run ID   |
> |--------------|------------|-----------|----------|
> | baseline     | wix-qa     | 1         | `abc123` |
> | baseline     | wix-qa     | 2         | `def456` |
> | baseline     | elastic-qa | 1         | `ghi789` |
> | baseline     | elastic-qa | 2         | `jkl012` |
> | jina-v2-ws20 | wix-qa     | 1         | `mno345` |
> | jina-v2-ws20 | wix-qa     | 2         | `pqr678` |
> | jina-v2-ws20 | elastic-qa | 1         | `stu901` |
> | jina-v2-ws20 | elastic-qa | 2         | `vwx234` |
> | cohere-ws40  | wix-qa     | 1         | `yza567` |
> | cohere-ws40  | wix-qa     | 2         | `bcd890` |
> | cohere-ws40  | elastic-qa | 1         | `efg123` |
> | cohere-ws40  | elastic-qa | 2         | `hij456` |
> | cohere-ws80  | wix-qa     | 1         | `klm789` |
> | cohere-ws80  | wix-qa     | 2         | `nop012` |
> | cohere-ws80  | elastic-qa | 1         | `qrs345` |
> | cohere-ws80  | elastic-qa | 2         | `tuv678` |

If any runs failed, add a note below the table listing which variant/dataset/iteration failed and the error message.

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
