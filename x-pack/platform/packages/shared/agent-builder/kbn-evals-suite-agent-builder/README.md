# @kbn/evals-suite-agent-builder

Agent Builder evaluations are run and experimented with using [Orca](https://github.com/elastic/orca) (Offline Reliability Check for Agents). See the Orca repository for setup and usage instructions.

## Running suites with `@kbn/evals`

This package contains the specs for several `@kbn/evals` suites. Run them with the evals CLI:

```bash
node scripts/evals list                                  # list all registered suites
node scripts/evals start --suite agent-builder           # start the eval stack (EDOT, Scout) and run a suite
node scripts/evals start --suite agent-builder --model <connector-id> --grep "product documentation"
node scripts/evals stop                                  # stop the background services
```

Run `node scripts/evals start --help` for all flags. Suites are registered in `.buildkite/pipelines/evals/evals.suites.json`.

## Suites in this package

| Suite ID                    | Config                                 | Samples | Covers                                                                                       |
| --------------------------- | -------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `agent-builder`             | `playwright.config.ts`                 | 52      | Default agent knowledge base retrieval and the product documentation tool                    |
| `skill-selection-benchmark` | `skill_selection.playwright.config.ts` | ~169    | Whether the agent picks the right skill (Platform, Streams, Security, Observability, Search) |
| `esql-generation`           | `esql.playwright.config.ts`            | 3       | ES\|QL generation. Early stage, very few samples                                             |

### `agent-builder`

- **Knowledge base retrieval** (`evals/kb`, 50 samples): text retrieval (9), analytical (15), hybrid (9), unanswerable (13) and ambiguous (4) queries.
- **Product documentation tool** (`evals/product_documentation`, 2 samples).

#### Data

The knowledge base samples depend on data that must already exist in the cluster under test:

- Text retrieval samples have ground truth pointing at documents in the `wix_knowledge_base` index.
- Analytical samples contain ES|QL that queries the `support_ticket`, `users`, `projects`, `invoice`, `invoice_item`, `error_rate_daily` and `requests_daily_count` indices.

Restoring snapshots or indexing corpora is covered in [Orca](https://github.com/elastic/orca) (see its "Restore or index the corpus" step and "Datasets & Snapshots" section). Orca lists the Wix corpus as cleaned files to index rather than a snapshot, and its snapshot configs don't include the analytical indices above.

> **TODO:** This suite does not load any snapshot or index data itself, so running it against a fresh cluster fails the knowledge base samples. The data needed for each dataset still has to be identified, and loading (for example with `@kbn/es-snapshot-loader`) added to the suite. This will be done in a separate PR.

### `skill-selection-benchmark`

Samples live in `evals/skill_selection/benchmark_dataset.csv`: ~169 queries across `platform` (37), `security` (51), `search` (35), `observability` (27) and `streams` (19). Each query is tagged `direct`, `indirect` or `distractor`, with the expected skill. It uses code-based evaluators only (no LLM judge) and needs no external data.

## Other Agent Builder suites

These live in their own packages:

- `agent-builder-dashboards`
- `agent-builder-visualizations`
- `ml` (ML Agent Builder skills)
- `attack-discovery-agent-builder`
