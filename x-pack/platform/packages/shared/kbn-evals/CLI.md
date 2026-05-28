# Evals CLI Reference

The `node scripts/evals` CLI orchestrates LLM evaluation workflows. All commands support `--help` for inline usage.

## Workflow overview

```
start  -->  [iterate: start again]  -->  stop
  |  ^
  |  +-- runs EDOT, Scout, EIS CCM, then Playwright
  |
  +-- auto-inits config + connectors on first run (or use init separately)
  |
logs (tail background service output)
```

`start` is the only command you need. On first run it auto-detects missing config and connectors, prompting you through setup before starting the stack. Use `init` separately only if you want to run setup in isolation (e.g. exporting `KIBANA_TESTING_AI_CONNECTORS` for use across terminals). Pass `--skip-init` to bypass these checks.

EDOT and Scout run as **persistent background daemons**. They survive between `start` runs so you can iterate on eval suites without waiting for ES/Kibana to restart each time.

## Commands

### `init` -- Set up connectors (optional)

Interactive wizard that discovers EIS models or validates existing connectors in `kibana.dev.yml`. Running `init` separately is **optional** -- `start` auto-triggers the same setup when config or connectors are missing.

Use `init` when you want to run setup in isolation, e.g. to export `KIBANA_TESTING_AI_CONNECTORS` to your shell before running `start` or `run` in another terminal.

```bash
node scripts/evals init
node scripts/evals init --skip-discovery
```

| Flag | Description |
|------|-------------|
| `--skip-discovery` | Skip EIS model discovery (reuse existing `target/eis_models.json`) |

#### `init config` -- Create a config profile

Creates a config profile (`config.json` or `config.<profile>.json`) by prompting for an infrastructure target -- **golden cluster**, **local**, or **custom** -- and the associated secrets (API keys, LiteLLM key, GCS credentials).

`--profile local` pre-selects the local target; otherwise golden cluster is the default.

```bash
node scripts/evals init config                   # default profile (golden cluster pre-selected)
node scripts/evals init config --profile local   # local profile (local target pre-selected)
node scripts/evals init config --profile <name>  # named profile
```

### `start` -- Start stack and run a suite

The main command. On first run, auto-detects missing config and connectors and prompts for setup. Then starts EDOT + Scout as background daemons, enables EIS CCM if needed, and runs a Playwright eval suite.

```bash
node scripts/evals start
node scripts/evals start --suite agent-builder
node scripts/evals start --suite agent-builder --model eis-gpt-4.1 --judge eis-claude-4-5-sonnet
node scripts/evals start --suite agent-builder --model eis-gpt-4.1,eis-claude-4-sonnet
node scripts/evals start --suite agent-builder --grep "product documentation"
node scripts/evals start --suite agent-builder --skip-server
node scripts/evals start --skip-init --suite agent-builder
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--suite <id>` | | Suite to run (interactive prompt if omitted) |
| `--config <path>` | | Playwright config path (alternative to `--suite`) |
| `--project <id>` | `--model` | Connector/model to evaluate (comma-separated for multiple) |
| `--evaluation-connector-id <id>` | `--judge` | Connector used for LLM-as-a-judge evaluators |
| `--profile <name>` | | Load both dataset + export settings from `config.<name>.json` in the vault config dir |
| `--datasets-profile <name>` | | Load dataset settings from `config.<name>.json` (sets `EVALUATIONS_KBN_URL`/`EVALUATIONS_KBN_API_KEY`) |
| `--export-profile <name>` | | Load export settings from `config.<name>.json` (sets `EVALUATIONS_ES_URL`, `TRACING_ES_URL`, and `TRACING_EXPORTERS`) |
| `--grep <pattern>` | | Filter tests by name (passed to Playwright `--grep`) |
| `--repetitions <n>` | | Number of times to repeat each example |
| `--skip-server` | | Skip EDOT/Scout/EIS startup (use existing services) |
| `--skip-init` | | Skip automatic first-run config and connector setup |
| `--dry-run` | | Print configuration and exit without running |

When flags are omitted and stdin is a TTY, `start` prompts interactively for suite, judge, model selection, and first-run config/connector setup. In non-TTY environments (e.g. CI), missing config or connectors cause a fast failure with an actionable error message.

Traces are exported by EDOT to the export cluster (controlled by `--export-profile` / `TRACING_ES_URL`), and `TRACING_ES_URL` is set so trace-based evaluators query the right cluster.

#### Golden dataset + local export (profiles)

Use profiles to fetch datasets from the golden cluster while exporting results and traces to your local Elasticsearch/Kibana (default: `http://localhost:9200` / `http://localhost:5601`).

Create the profiles explicitly (see [`init config`](#init-config----create-a-config-profile) above), or let `start --profile <name>` prompt you when the config is missing:

```bash
node scripts/evals init config                   # default profile (golden cluster pre-selected)
node scripts/evals init config --profile local   # local profile (local target pre-selected)
```

Run:

```bash
node scripts/evals start --suite attack-discovery --export-profile local
```

### `stop` -- Stop background services

```bash
node scripts/evals stop
node scripts/evals stop --service scout
node scripts/evals stop --service edot
```

| Flag | Description |
|------|-------------|
| `--service <name>` | Stop only `edot` or `scout` (default: stop all) |

### `logs` -- Tail service logs

```bash
node scripts/evals logs
node scripts/evals logs --service scout
node scripts/evals logs --service edot --from-start
```

| Flag | Description |
|------|-------------|
| `--service <name>` | Tail only `edot` or `scout` (default: both) |
| `--from-start` | Show logs from the beginning (default: tail from current position) |

### `scout` -- Start Scout standalone

Convenience wrapper around `node scripts/scout.js start-server` with evals defaults (`--arch stateful --domain classic --serverConfigSet evals_tracing`). Extra flags are forwarded to Scout.

```bash
node scripts/evals scout
```

Use this when you want to manage Scout separately from the `start` workflow.

### `run` -- Run a suite (no service management)

Runs a Playwright eval suite without managing EDOT/Scout. Use this when you already have services running (via `start`, `scout`, or manually).

```bash
node scripts/evals run --suite agent-builder --judge bedrock-claude
node scripts/evals run --suite obs-ai-assistant --model azure-gpt4o --repetitions 3
node scripts/evals run --suite agent-builder --grep "product documentation"
node scripts/evals run --suite streams --dry-run
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--suite <id>` | | Suite to run (interactive prompt if omitted) |
| `--config <path>` | | Playwright config path (alternative to `--suite`) |
| `--project <id>` | `--model` | Connector/model to evaluate |
| `--evaluation-connector-id <id>` | `--judge` | Connector for LLM-as-a-judge evaluators |
| `--grep <pattern>` | | Filter tests by name (passed to Playwright `--grep`) |
| `--repetitions <n>` | | Repeat each example N times |
| `--executor <name>` | | `kibana` (default) or `phoenix` |
| `--profile <name>` | | Load both dataset + export settings from `config.<name>.json` |
| `--datasets-profile <name>` | | Load dataset settings from `config.<name>.json` |
| `--export-profile <name>` | | Load export settings from `config.<name>.json` |
| `--trace-es-url <url>` | | Elasticsearch URL for trace queries |
| `--trace-es-api-key <key>` | | API key for trace ES |
| `--evaluations-es-url <url>` | | Elasticsearch URL for storing eval results |
| `--evaluations-es-api-key <key>` | | API key for evaluations ES |
| `--phoenix-base-url <url>` | | Phoenix API URL (when using `--executor phoenix`) |
| `--phoenix-api-key <key>` | | Phoenix API key |
| `--dry-run` | | Print the Playwright command and exit |

### `list` -- List available suites

```bash
node scripts/evals list
node scripts/evals list --refresh
node scripts/evals list --json
```

| Flag | Description |
|------|-------------|
| `--refresh` | Re-scan the repo for suite configs |
| `--json` | Output as JSON |

### `doctor` -- Check prerequisites

```bash
node scripts/evals doctor
node scripts/evals doctor --fix
```

| Flag | Description |
|------|-------------|
| `--fix` | Attempt to auto-fix detected issues |

### `compare` -- Compare eval runs

```bash
node scripts/evals compare <run-id-a> <run-id-b>
```

### `env` -- List environment variables

```bash
node scripts/evals env
```

### `ci-map` -- Output CI label mapping

```bash
node scripts/evals ci-map
node scripts/evals ci-map --json
```

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

## Tips

**Fast iteration:** Use `--grep` to run a single test within a large suite:

```bash
node scripts/evals start --suite agent-builder --grep "product documentation" --model eis-gpt-4.1
```

**Reuse services:** After the first `start`, EDOT and Scout stay alive. Subsequent `start` runs detect them and skip to step 3 (EIS CCM) or step 4 (Playwright). This cuts iteration time significantly.

**Multiple models:** Pass comma-separated model IDs to `--model`:

```bash
node scripts/evals start --suite agent-builder --model eis-gpt-4.1,eis-claude-4-sonnet
```

**View traces locally:** EDOT exports traces to your local ES (from `kibana.dev.yml`). Open your local Kibana at `http://localhost:5601` to view APM traces and LLM spans.
