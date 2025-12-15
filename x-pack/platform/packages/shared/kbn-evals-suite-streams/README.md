# @kbn/evals-suite-streams

Evaluation suite for Elastic Streams pattern extraction quality.

## Quick Start

```bash
# Start Scout server
node scripts/scout.js start-server --stateful

# Run evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts
```

## Pattern Extraction Evaluation

Tests Grok and Dissect pattern generation using 21 real-world log examples with quality metrics:

- **Parse Rate** (25%) - Successfully parsed log lines
- **Timestamp Accuracy** (25%) - Correct timestamp extraction
- **Log Level Accuracy** (15%) - Correct log level identification
- **Field Quality** (25%) - Field names/values accuracy
- **Field Count Penalty** (10%) - Over/under-extraction penalty

Pattern generation uses `@kbn/grok-heuristics` and `@kbn/dissect-heuristics`.