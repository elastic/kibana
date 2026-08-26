# storage_adapter_heap_lab (TEMPORARY - DO NOT MERGE)

Throwaway experiment plugin for [elastic/kibana-team#3973](https://github.com/elastic/kibana-team/issues/3973)
(parent epic [#3971](https://github.com/elastic/kibana-team/issues/3971)).

It measures how Elasticsearch heap / shard count / mapping field-count grow as
many `@kbn/storage-adapter` indices are created at scale. This exists **only** on
this branch for testing; it must never be merged to `main` and never ship.

## What it does

A regular (server-only) plugin exposing two internal endpoints:

- `POST /internal/storage_adapter_heap_lab/generate`
  - body: `{ numIndices, numFields, numDocs, indexPrefix?, batchSize?, seed? }`
  - Server-side, it synthesizes a realistic flat mapping of `numFields` fields
    (keyword/text/numeric/date/boolean mix), creates `numIndices`
    storage-adapter indices, and bulk-inserts `numDocs` synthetic documents each.
- `GET /internal/storage_adapter_heap_lab/stats`
  - returns per-node JVM heap plus cluster-wide index/shard/field counts.

The driver script `scripts/run_experiment.js` ramps the number of indices,
sampling `stats` between steps (with a stabilization pause) and writing a CSV.

## Running locally

1. Start ES: `node scripts/es snapshot`
2. Start Kibana with a stable base path: `node scripts/kibana --dev --no-base-path`
3. Run the driver:
   ```
   NUM_FIELDS=100 DOCS_PER_INDEX=10 STEP_INDICES=25 STEPS=20 \
     node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/run_experiment.js
   ```

For serverless (deployed via a `ci:project-deploy-elasticsearch` PR label), set
`KIBANA_URL` and `KBN_API_KEY` and monitor the "memory as returned by ES"
autoscaling dashboard alongside the CSV.
