# @kbn/evals-suite-streams

Evaluation suite for Elastic Streams pattern extraction quality.

## Quick Start

```bash
# Start Scout server
node scripts/scout.js start-server --arch stateful --domain classic

# Run evaluations
node scripts/evals run --suite streams --evaluation-connector-id azure-gpt4o

# Only run pipeline_suggestion
node scripts/evals run --suite streams --evaluation-connector-id azure-gpt4o pipeline_suggestion
```

### EIS connector (Vault CCM + `evals start`)

From the repo root, with Vault logged in (`vault login --method oidc`):

```bash
x-pack/platform/packages/shared/kbn-evals-suite-streams/scripts/run_stream_evals_eis.sh eis-google-gemini-3-1-pro
# optional second arg: Playwright --grep (default: Pipeline suggestion)
```

Skips `discover_eis_models` when `target/eis_models.json` already exists (delete that file to refresh). Stops background services afterward with `node scripts/evals stop`.

## Creating New Datasets

You can easily create new dataset entries from AI suggestions generated in Kibana:

1. In Kibana Streams UI, generate a suggestion (grok, dissect, or pipeline)
2. Open browser dev console and run: `copyStreamsSuggestion()`
3. Run the dataset creation script:
   ```bash
   pbpaste | node --require ./src/setup_node_env/ ./x-pack/platform/packages/shared/kbn-evals-suite-streams/scripts/create_dataset_from_clipboard.ts
   ```
4. The script will automatically:

   - Read the JSON from stdin (piped from clipboard)
   - Generate a dataset entry with appropriate structure
   - Insert it into the correct dataset file with a `🔧 NEW DATASETS GO HERE` marker
   - Add TODO comments for fields that need manual review

5. Review the generated entry and fill in TODO items:
   - Adjust expected fields and their types
   - Set appropriate quality thresholds
   - Add any missing metadata

## Parallel Execution

Tests run in parallel across 20 Playwright workers using `fullyParallel: true`. A shared setup/teardown project handles lifecycle:

- **Setup project** (runs once): enables streams, forks child streams from `logs.otel`, indexes synthtrace data
- **Test projects** (one per connector, fully parallel): all eval tests are stateless and run concurrently
- **Teardown project** (runs once): disables streams, deletes connectors, cleans up data streams

Connector creation is idempotent (handles 409 conflicts) so multiple workers can safely set up the same connector.

To run a single connector:
```bash
node scripts/evals run --suite streams --evaluation-connector-id bedrock-claude --project bedrock-claude
```

## Pattern Extraction Evaluation

Tests Grok and Dissect pattern generation using 21 real-world log examples with quality metrics:

- **Parse Rate** (25%) - Successfully parsed log lines
- **Timestamp Accuracy** (25%) - Correct timestamp extraction
- **Log Level Accuracy** (15%) - Correct log level identification
- **Field Quality** (25%) - Field names/values accuracy
- **Field Count Penalty** (10%) - Over/under-extraction penalty

Pattern generation uses `@kbn/grok-heuristics` and `@kbn/dissect-heuristics`.
