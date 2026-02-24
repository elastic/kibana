# @kbn/evals-suite-streams

Evaluation suite for Elastic Streams pattern extraction quality.

## Quick Start

```bash
# Start Scout server
node scripts/scout.js start-server --arch stateful --domain classic

# Run evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/kbn-evals-suite-streams/test/scout/ui/playwright.config.ts
```

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

## Pattern Extraction Evaluation

Tests Grok and Dissect pattern generation using 21 real-world log examples with quality metrics:

- **Parse Rate** (25%) - Successfully parsed log lines
- **Timestamp Accuracy** (25%) - Correct timestamp extraction
- **Log Level Accuracy** (15%) - Correct log level identification
- **Field Quality** (25%) - Field names/values accuracy
- **Field Count Penalty** (10%) - Over/under-extraction penalty

Pattern generation uses `@kbn/grok-heuristics` and `@kbn/dissect-heuristics`.