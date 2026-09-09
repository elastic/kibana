# Semantic Log Search Evaluation Harness

This harness evaluates the `semanticLogSearch` service against a labelled corpus. It measures how well semantic search ranks relevant log patterns and detects regressions in literal search.

## Prerequisites

1. **Elasticsearch with EIS** — Start with inference endpoints enabled:
   ```bash
   yarn es snapshot --eis
   ```

2. **Kibana** — Start Kibana:
   ```bash
   yarn start
   ```

3. **Synthtrace corpus** — Generate the test corpus:
   ```bash
   node scripts/synthtrace sigevents \
     --target=http://elastic:changeme@localhost:9200 \
     --kibana=http://elastic:changeme@localhost:5620 \
     --scenarioOpts="scenario=postgres_timeout,seed=42" \
     --from=now-2h --to=now --clean
   ```

## Tasks

Run from the Kibana root directory:

### 1. Setup Scaffold (`--task setup`)

Creates the PoC data stream with `semantic_text` and `pattern_text` mappings and reindexes documents from the synthtrace corpus.

```bash
node x-pack/platform/plugins/shared/logs_data_access/scripts/semantic_log_search.ts --task setup
```

This:
- Resolves the default inference endpoint (ELSER in EIS)
- Creates an index template with `message` as `pattern_text` (with `copy_to` to `message_semantic`)
- Creates `logs-poc.a-default` data stream
- Reindexes all documents from `logs-synth-default`
- Verifies semantic search works

**Time:** Minutes (each document is embedded).

### 2. Audit Corpus (`--task audit`)

Verifies that ground truth labels are present in the corpus.

```bash
node x-pack/platform/plugins/shared/logs_data_access/scripts/semantic_log_search.ts --task audit
```

This:
- Counts documents matching each labelled pattern
- Reports missing patterns (excluded from recall calculations)
- Validates the corpus before running evaluation

Run this if the synthtrace scenario changes or after re-generating the corpus.

### 3. Run Evaluation (`--task eval`)

Runs retrieval evaluation using the real service.

```bash
node x-pack/platform/plugins/shared/logs_data_access/scripts/semantic_log_search.ts --task eval
```

This:
- Executes each ground truth query through `semanticLogSearch.search()`
- Calculates P@10, recall, and distinct message counts
- Reports hard negatives found in top results

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--task` | `eval` | Task to run: `setup`, `audit`, or `eval` |
| `--es` | `http://localhost:9200` | Elasticsearch URL |
| `--user` | `elastic` | Elasticsearch user |
| `--password` | `changeme` | Elasticsearch password |
| `--source` | `logs-synth-default` | Source index (for setup) |
| `--target` | `logs-poc.a-default` | Target data stream |

## Understanding the Metrics

### P@10 (Precision at 10)

Fraction of top 10 results that are relevant. Higher is better.

- `1.0` = all top 10 are relevant
- `0.5` = half of top 10 are relevant
- Goal: semantic queries should have P@10 > 0.5

### Recall

Fraction of relevant patterns found in all results. Higher is better.

- `1.0` = all relevant patterns found
- `0.5` = half of relevant patterns found
- Goal: recall > 0.7 for semantic queries

### Distinct Messages

Number of unique log patterns returned. The service should group similar messages.

- High values indicate good deduplication
- Low values may indicate missing categories

### Hard Negatives

Lexical traps that contain relevant keywords but describe healthy state. Finding these in top results indicates the semantic ranking is failing to distinguish meaning from vocabulary overlap.

- `0` = perfect (no traps in top 10)
- `> 0` = semantic ranking needs improvement

## Ground Truth

The ground truth is defined in `ground_truth.ts`. It consists of:

- **CONNECTION_FAILURE**: Messages reporting connectivity/reachability failures
- **CONNECTION_HEALTHY**: Lexical traps (contain "connection" but are healthy)
- **CONNECTION_WARNING**: Near-capacity warnings (not failures)
- **DB_SLOWNESS**: Slow query messages (not connectivity)

Each query specifies:
- `relevant`: Patterns that should be ranked highly
- `hardNegatives`: Traps that should be ranked low

## Caveats

The scaffold (`logs-poc.a-default`) is **not the production ingestion shape**. It exists to:
1. Exercise the service end-to-end
2. Measure semantic ranking quality
3. Verify the contract works

Production ingestion is a separate workstream. The scaffold requires a mapping change and reindex, which cannot be applied to existing data streams.
