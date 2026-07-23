---
name: run-agent-builder-skill-eval
description: Run a behavioral eval spec for a specific agent-builder skill against a locally-running Kibana/ES stack. Handles prereq checks, Scout file creation, and runs the suite.
allowed-tools: Bash, Read, Write, AskUserQuestion
argument-hint: [spec-path-or-grep-pattern]
---

# Run Agent Builder Skill Eval

This skill runs a behavioral evaluation spec (or subset of specs) from the `agent-builder` suite against your locally-running Kibana and Elasticsearch. It assumes you manage your own stack — it does **not** launch ES or Kibana.

Use this when you've written or modified a skill spec under `evals/platform/` or `evals/external/` and want to verify it locally before pushing to CI.

---

## What "passing" means

Behavioral eval tests pass or fail on **exception only** — a test passes if it runs without throwing. Score output (Factuality, Groundedness, Relevance, etc.) is observability data for trending, not a gate. CODE evaluators (e.g. `ExpectedSkillInvocation`, `RequiredTermsInResponse`) are binary 0/1 and can gate CI via trace-based assertions, but they don't fail the Playwright test by default either.

This means: a test showing `Factuality: 0.0` still "passes" from the framework's perspective. Low scores are a signal to investigate, not an automatic failure.

**Trace-based evaluator noise:** The `evaluate_dataset` fixture wires up trace-based evaluators (Latency, Input Tokens, Output Tokens, Cached Tokens, Skill Invoked) for every spec in the suite, including behavioral skill specs. Without a running EDOT collector, these query the OTEL tracing index, find nothing, and retry 5 times with exponential backoff — adding minutes of overhead per test. The run command in Step 4 includes `SELECTED_EVALUATORS` to skip these by default. If you need them, run with `--profile dev-vault` and a full EDOT stack.

---

## Step 1: Check prerequisites

### 1a: Verify ES and Kibana are running

Source `scripts/kibana_api_common.sh` to auto-detect Kibana:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"
echo "Kibana: $KIBANA_URL ($KIBANA_AUTH)"
```

If detection fails, tell the user:

> Kibana doesn't appear to be running. Please start your stack first:
> - ES: `yarn serverless-es` (or `yarn es snapshot --eis` for snapshot data)
> - Kibana: `yarn serverless-es` in a separate terminal (or `yarn start --no-base-path` for stateful)
>
> Then re-run this skill.

Do NOT attempt to start ES or Kibana. Stop here if they're not running.

Derive ES connection from KIBANA_AUTH (same username/password). For serverless:
- ES host: `http://localhost:9200` (try `https://` if `http://` fails)
- ES auth: same as `KIBANA_AUTH`

Verify ES is up:

```bash
ES_USER="${KIBANA_AUTH%%:*}"
ES_PASS="${KIBANA_AUTH#*:}"
curl -sk -u "$ES_USER:$ES_PASS" http://localhost:9200/_cluster/health | grep -q '"status"' \
  && echo "ES OK" || curl -sk -u "$ES_USER:$ES_PASS" https://localhost:9200/_cluster/health | grep -q '"status"' \
  && echo "ES OK (https)" || echo "ES not reachable"
```

### 1b: Verify `xpack.evals.enabled: true` in `kibana.dev.yml`

```bash
grep -q 'xpack.evals.enabled: true' "$REPO_ROOT/config/kibana.dev.yml" \
  && echo "evals enabled" || echo "MISSING"
```

If missing, tell the user to add it and restart Kibana:

```yaml
xpack.evals.enabled: true
```

### 1b-ii: Detect ES scheme

Note whether ES is on HTTP or HTTPS — you'll need this in Step 1d. Use whichever scheme succeeded in the health check above.

### 1c: Verify at least one connector is configured

Check `config/kibana.dev.yml` for `xpack.actions.preconfigured`. If the section is absent or empty, tell the user:

> No preconfigured connectors found in `config/kibana.dev.yml`. Add at least one under `xpack.actions.preconfigured`. Example for Opus 4.6 via EIS:
>
> ```yaml
> xpack.actions.preconfigured:
>   Anthropic-Claude-Opus-4-6:
>     name: Anthropic Claude Opus 4.6
>     actionTypeId: .inference
>     exposeConfig: true
>     config:
>       provider: 'elastic'
>       taskType: 'chat_completion'
>       inferenceId: '.anthropic-claude-4.6-opus-chat_completion'
>       providerConfig:
>         model_id: 'anthropic-claude-4.6-opus'
> ```
>
> Then restart Kibana.

### 1d: Check and fix `config.local.json`

Step 4 will output a command using `--profile local` (required for non-interactive runs). The first time `node scripts/evals start --profile local` runs, it auto-generates `config.local.json` — but it hardcodes `elastic:changeme` and `http://` regardless of your actual stack credentials and ES scheme.

Check the file:

```bash
cat "$REPO_ROOT/x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.local.json" 2>/dev/null || echo "missing (will be generated on first run)"
```

If it exists, verify:
- `evaluationsEs.url` and `tracingEs.url` use the correct username and scheme (e.g. `https://elastic_serverless:changeme@localhost:9200` for serverless with HTTPS ES, or `http://elastic:changeme@localhost:9200` for stateful)
- `evaluationsKbn.url` is `http://<user>:<pass>@localhost:5601` — **no path suffix** (a `/dev` suffix causes the KbnClient to resolve all internal routes under `/dev/internal/...`, producing 404s that look like the evals plugin is disabled)

If the file is missing or has wrong values, fix it before running. The file is gitignored and safe to edit directly.

---

## Step 2: Ensure Scout files exist

The eval framework requires two files that are normally written by `scout start-server`. Create them if missing.

### 2a: `.scout/servers/local.json`

Check if it exists:

```bash
ls "$REPO_ROOT/.scout/servers/local.json" 2>/dev/null && echo "exists" || echo "missing"
```

If missing, create it. Derive `kibana` host from `KIBANA_URL`. For ES host, use whichever scheme succeeded in Step 1b-ii (`http://` or `https://`). Use `serverless: true` when running in serverless mode (i.e. when `KIBANA_AUTH` is `elastic_serverless:changeme`), `false` otherwise.

```json
{
  "serverless": true,
  "isCloud": false,
  "uiam": false,
  "license": "trial",
  "projectType": "security",
  "productTier": "complete",
  "cloudUsersFilePath": "<REPO_ROOT>/.ftr/role_users.json",
  "hosts": {
    "kibana": "<KIBANA_URL>",
    "elasticsearch": "<http-or-https>://localhost:9200"
  },
  "auth": {
    "username": "<ES_USER>",
    "password": "<ES_PASS>"
  }
}
```

**Important:** `cloudUsersFilePath` must be the absolute path, not `~`.

### 2b: `.ftr/role_users.json`

Check if it exists:

```bash
ls "$REPO_ROOT/.ftr/role_users.json" 2>/dev/null && echo "exists" || echo "missing"
```

If missing, create it (this file is read lazily for SAML auth only — minimal content is fine):

```json
{ "admin": { "email": "admin@example.com", "password": "changeme" } }
```

---

## Step 3: Collect eval parameters

### 3a: Determine which spec(s) to run

If `$ARGUMENTS` is non-empty, use it as a `--grep` filter. Otherwise, ask:

> Which spec(s) do you want to run?

Options:
- **All agent-builder specs** — run the entire suite (no grep filter)
- **ki-automation-generation** — `--grep "ki.automation.generation"`
- **Enter a grep pattern** — (other)

### 3b: Discover available connectors

Read `config/kibana.dev.yml` and parse `xpack.actions.preconfigured` connector IDs and names.

### 3c: Select the model connector to evaluate

Ask:

> Which connector/model should be evaluated?

Options: one per discovered connector, using `<id> (<name>)` as the label.

### 3d: Select the judge connector

Ask:

> Which connector should be used as the LLM judge?

Options: one per discovered connector. Default to the same connector as the model (judge and model can be the same).

---

## Step 4: Run the evals

Tell the user:

> **Prerequisites verified. Stack is ready. Running evals now...**
>
> - Kibana: `<KIBANA_URL>` (`<KIBANA_AUTH username>`)
> - Evals plugin: enabled
> - Scout files: present

Then run the command directly using the Bash tool (do not ask the user to run it). Substitute actual values; omit `--grep` if no filter was selected:

```bash
cd <REPO_ROOT> && \
KBN_EVALS_SKIP_CONNECTOR_SETUP=true \
SELECTED_EVALUATORS="Factuality,Groundedness,Relevance,RequiredTermsInResponse,ExpectedSkillInvocation,ExpectedToolCalled" \
EVALUATION_CONNECTOR_ID=<judge_connector_id> \
node scripts/evals start \
  --suite agent-builder \
  --skip-server \
  --profile local \
  --model <model_connector_id> \
  [--grep "<pattern>"]
```

This command runs for several minutes. Use a Bash timeout of at least 600000ms (10 minutes). When it completes, summarize the results table (dataset names and scores).

**`SELECTED_EVALUATORS` is set explicitly** to skip the trace-based evaluators (Latency, Input Tokens, Output Tokens, Cached Tokens, Skill Invoked). Without this, those evaluators query the OTEL tracing index, fail to find data (since there's no EDOT collector running), and retry 5 times with exponential backoff — adding minutes of overhead per test. Remove `SELECTED_EVALUATORS` only if you have a full EDOT/tracing stack running (e.g. `--profile dev-vault`).

**`--profile` is required** — `node scripts/evals start` errors in non-interactive mode without it. Use `--profile local` for local runs against your own stack. Use `--profile dev-vault` to ship results to the golden cluster (requires `vault login --method oidc`).

Then add this note:

> **Reminder:** Score output (Factuality, Groundedness, etc.) is observability data — tests pass/fail on exception only. A score of 0 does not fail the test; it's a signal to investigate.

---

## Important notes

- **Do not launch ES or Kibana** — this skill assumes the user's stack is already running.
- **Do not use `node scripts/playwright test` directly** — use `node scripts/evals start` with `--skip-server` instead; it handles connector discovery and EDOT correctly.
- **`KBN_EVALS_SKIP_CONNECTOR_SETUP=true`** — required when using preconfigured connectors from `kibana.dev.yml` to skip the connector creation/teardown lifecycle.
- **Scout files are not idempotent** — `scout start-server` overwrites `.scout/servers/local.json`. If the user restarts Scout, these files may need to be recreated.
- **Serverless vs stateful**: serverless uses `elastic_serverless:changeme`; stateful uses `elastic:changeme`. The `kibana_api_common.sh` auto-detects which is running.
