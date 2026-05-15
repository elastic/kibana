# caseId perf bench

Local-only harness to measure the read-side gain of the indexed scripted
`caseId` keyword (this branch) vs. the current nested-`references` queries.
Both query shapes run against the **same seeded data on the same cluster** —
on this branch every attachment / comment doc has both the legacy `references`
array and the new `caseId` field, so variant A (`nested references.id`) and
variant B (`term/terms caseId`) measure the same logical question two ways.

The bench bypasses Kibana and talks to Elasticsearch directly. We're measuring
the **delta** between query shapes, and the Kibana request middleware overhead
is constant across both — so for the "% improvement" decision number, going
direct is cleaner and faster.

> **Throwaway tooling.** Lives on a perf branch; never merges to `main`.

## Setup

In three terminals from the repo root:

```bash
# 1. ES (with snapshot data so the cases SO indexes exist after restart-friendly)
yarn es snapshot

# 2. Kibana on this branch (cases-add-caseId).
#    On startup the model-version mapping bump runs `_update_by_query` and
#    populates `caseId` for any pre-existing cases-comments docs.
yarn start

# 3. Seed data
cd x-pack/platform/plugins/shared/cases
# Smoke (~30s)
yarn generate:cases -c 100 -m 5 -a 20 -e 5 --seed perf-smoke
# Realistic (~15-20 min, dominated by alert document indexing)
yarn generate:cases -c 1000 -m 5 -a 50 -e 10 --seed perf-realistic
```

Wait until Kibana finishes the saved-objects migration on startup before
seeding (look for `Saved objects migration: complete`).

## Run the bench

```bash
cd x-pack/platform/plugins/shared/cases

# Default: all 3 queries × both variants × 50 warmup + 200 iterations,
# 10 case ids per query, warm cache only.
yarn bench:caseid

# A single query, single variant, with cold cache between iterations
yarn bench:caseid \
  --query unified-attachment-stats \
  --variant a \
  --cold \
  --iterations 100 --warmup 30

# Single-case stats path (most common user-visible call shape)
yarn bench:caseid --caseIdsPerQuery 1

# Custom ES endpoint / auth
yarn bench:caseid --esUrl http://localhost:9200 --esUser elastic --esPass changeme
```

CSVs land in `<repo>/perf-results/` by default (configurable via `--outDir`).
Each run writes one CSV per query containing iteration, variant, ES `took`,
client wall time, hit count, and a hash of the sampled case ids.

## Queries

| Name | What it measures | Backend reference |
| --- | --- | --- |
| `unified-attachment-stats` | Stats grouped by case over `cases-attachments` (user comments + events) | `getUnifiedAttachmentStatsByCaseId` in `server/services/attachments/operations/get.ts` |
| `comment-stats` | Stats grouped by case over `cases-comments` (alerts cardinality + user comments + events cardinality) | `buildCommentStatsAggs` in the same file |
| `find-by-caseid` | Plain "all attachments for these case ids" search — the lowest-level pattern shared by virtually every per-case query | Implicit |

Variant `a` mirrors what the cases server issues today (nested + reverse_nested).
Variant `b` is the equivalent flat-`caseId` query — what the server *would* issue
after migrating the helpers.

## Methodology notes

- **Warmup.** The first ~50 iterations of any new query shape pay JIT + cache
  costs. The bench's warmup phase runs and discards `--warmup` iterations
  before measurement starts.
- **Painless script compile.** The `caseId` index-time script compiles once on
  the very first write after a Kibana restart. By the time you're querying, it's
  cached. If you restart Kibana between bench runs, the variant B *first*
  measurement may include a one-time penalty — the `--warmup` covers it.
- **OS file cache.** Back-to-back runs share warm OS cache. Use `--cold` to
  clear ES caches between iterations for cold-cache numbers (slower; only
  useful for "what does the worst case look like" data).
- **Sampling.** Each iteration picks `--caseIdsPerQuery` ids uniformly at
  random from the seed's case-id pool. This defeats single-key caching at the
  shard request cache level. Set `--caseIdsPerQuery 1` to measure the
  per-case-stats endpoint shape.
- **Index pattern.** Defaults to `.kibana_alerting_cases*`. Override with
  `--index` if your cluster uses a different pattern.

## Reading the output

Console prints per-run summary: `mean / p50 / p95 / p99 / min / max` for both
ES `took` and client wall time. The CSVs let you re-summarise (e.g. excluding
outliers, splitting cold from warm) without re-running.

For the headline write-up, the relevant comparison is **variant B's p95/p99
ES `took` divided by variant A's** for each query. Less than 1 means B is
faster.

## Cleanup

```bash
yarn generate:cases --cleanup
```

Removes the cases SOs created by the generator. Note: the generator's source
data (alert / event documents in `.alerts-*` / `logs-endpoint.events.process-*`)
is NOT removed by `--cleanup` (per the PR's design — it preserves source data).
For perf testing, that's fine; if you want a clean slate, restart `yarn es snapshot`.
