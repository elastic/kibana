# @kbn/evals-suite-streams

Evaluation suite for Elastic Streams pattern extraction quality and feature identification.

## Quick Start

```bash
# Start Scout server
node scripts/scout.js start-server --stateful

# Run evaluations
node scripts/playwright test --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts

# Run unit tests
yarn test:jest x-pack/platform/packages/shared/kbn-evals-suite-streams
```

## Pattern Extraction Evaluation

Tests Grok and Dissect pattern generation quality using 21 real-world log examples (200+ samples).

### Quality Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| Parse Rate | 25% | Successfully parsed log lines |
| Timestamp Accuracy | 20% | Correct timestamp extraction |
| Log Level Accuracy | 15% | Correct log level identification |
| Field Quality | 30% | Field names/values accuracy |
| Field Count Penalty | 10% | Over/under-extraction penalty |

### Key Files

- `pattern_extraction_datasets.ts` - 21 examples with ground truth
- `pattern_extraction_metrics.ts` - Quality calculation (5 functions, 26 tests)
- `pattern_extraction_helpers.ts` - Utilities (14 functions, 64 tests)
- `pattern_extraction.spec.ts` - Main evaluator with Phoenix integration
- `pattern_generation_integration.test.ts` - Pattern generation tests (6 tests)

### Architecture

```
Sample Logs → Pattern Generation (Grok/Dissect) → Mock Parsing → Quality Metrics → Phoenix LLM Scoring
```

Pattern generation uses `@kbn/grok-heuristics` and `@kbn/dissect-heuristics`. Parsing is currently mocked.

## Adding Examples

1. Find real logs: `find tmp_integrations/packages/*/data_stream/*/sample_event.json`
2. Add to `pattern_extraction_datasets.ts` with 8-10+ actual samples
3. Run: `node scripts/playwright test --grep "your_stream"`

## Validation

```bash
node scripts/eslint --fix x-pack/platform/packages/shared/kbn-evals-suite-streams/evals/
node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-streams/tsconfig.json
yarn test:jest x-pack/platform/packages/shared/kbn-evals-suite-streams
```

All must pass with 0 errors before committing.

## Related Documentation

- [Kibana Development Guidelines](/.github/copilot-instructions.md)
- [Phoenix Documentation](https://docs.arize.com/phoenix)
- [Grok Patterns](https://www.elastic.co/guide/en/elasticsearch/reference/current/grok-processor.html)
- [Dissect Patterns](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html)

