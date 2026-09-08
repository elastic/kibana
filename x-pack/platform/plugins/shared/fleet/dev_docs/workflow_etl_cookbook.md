# Workflow ETL cookbook for integration packages

**Status:** implemented
**Audience:** package authors writing scheduled ingest workflows

Recipes for the recurring problems in packaged ETL: incremental sync, paginating
a rate-limited API, and writing to Elasticsearch idempotently. Every pattern here
is taken from shipped workflows, not sketched.

## 1. Incremental sync with a checkpoint

An ingest workflow must resume where the last run stopped. Use the stock
`data.loadCheckpoint` step — do not hand-roll a search against a state index.

```yaml
steps:
  - name: read_checkpoint
    type: data.loadCheckpoint
    with:
      index: "{{ consts.syncStateIndex }}"
      id: "{{ consts.syncSource }}-{{ consts.orgLogin }}-{{ consts.entityType }}"

  - name: init_state
    type: data.set
    with:
      cursor: ${{ steps.read_checkpoint.output.cursor ?? "" }}
      watermark: ${{ steps.read_checkpoint.output.watermark ?? "" }}
      runStartedAt: "{{ execution.startedAt }}"
```

Two things matter here:

- **The checkpoint ID must be the real document ID.** Compose it from the same
  parts the writer uses. A derived-looking ID that does not match what was
  written returns `{}` forever, and the workflow silently full-syncs on every
  run while appearing healthy.
- **`??` supplies the first-run default,** so an empty checkpoint is a legitimate
  cold start rather than an error.

### Seeding the first run

A cold start needs a lower bound, or the first query is unbounded:

```yaml
  - name: ensure_watermark
    type: data.set
    if: ${{ variables.watermark == null or variables.watermark == "" }}
    with:
      watermark: "{{ consts.initialWatermark }}"
```

## 2. Do not let runs overlap

A 30-minute schedule with a run that occasionally takes 40 minutes will
double-ingest and double-spend rate limit. Declare a concurrency guard:

```yaml
settings:
  timeout: 30m
  concurrency:
    key: sdlc-github-activity-issues
    strategy: drop
    max: 1
```

`drop` skips the new run when one is in flight — correct for periodic sync,
where the next tick will catch up anyway. Always set an explicit `timeout`; a
run without one can hold its concurrency slot indefinitely if the upstream API
hangs.

## 3. Paginate with a bounded loop

Page through a cursor API with `while`, and **always** cap iterations:

```yaml
  - name: paginate_issues
    type: while
    condition: "steps.fetch_issues.output.pageInfo.hasNextPage : true"
    max-iterations: 10
    steps:
      - name: fetch_issues
        type: github.runQueryTemplate
        connector-id: "{{ consts.githubConnectorId }}"
        with:
          templateId: activity.searchIssues
          variables:
            query: "{{ variables.searchQuery }}"
          first: ${{ consts.pageSize }}
          after: "{{ variables.cursor }}"
```

`max-iterations` bounds the blast radius of a mis-advancing cursor. Combined
with a persisted cursor, a capped run is not a lost run — the next scheduled run
resumes from the checkpoint. Prefer many small runs to one unbounded run.

## 4. Query the source by watermark, ascending

Sort **ascending** by the field the watermark tracks:

```yaml
  - name: build_search_query
    type: data.set
    with:
      searchQuery: org:{{ consts.orgLogin }} is:issue sort:updated-asc updated:>{{ variables.watermark }}
```

Ascending order means an interrupted run leaves a watermark that is behind but
never ahead of unprocessed records. Descending order with a watermark update
will silently skip everything between the interruption and the newest record.

## 5. Write idempotently with a bulk upsert

Use `elasticsearch.bulk` with an `id_field` so re-processing a record updates it
instead of duplicating it:

```yaml
  - name: index_issues
    type: elasticsearch.bulk
    with:
      index: "{{ consts.issuesIndex }}"
      operation: index
      id_field: entity.id
      documents: ${{ variables.bulkOps }}
```

Because the source is queried by an inclusive `updated:>` bound, records **will**
be re-fetched at boundaries. Idempotent writes make that a no-op rather than a
duplicate. Build the document envelope in a preceding `data.set` step — mapping
source records to your index schema is workflow logic, not connector logic.

## 6. Advance the checkpoint last

Write the checkpoint only after a successful write, and store what the next run
needs:

```yaml
  - name: write_checkpoint
    type: elasticsearch.index
    with:
      index: "{{ consts.syncStateIndex }}"
      id: "{{ consts.syncSource }}-{{ consts.orgLogin }}-{{ consts.entityType }}"
      document:
        cursor: "{{ variables.cursor }}"
        watermark: "{{ variables.lastIssueUpdatedAt }}"
        sync:
          run_id: "{{ execution.id }}"
          updated_at: "{{ execution.startedAt }}"
```

Advancing the checkpoint before the write means a failed write loses data
permanently — the next run starts after records that were never indexed.

## Anti-patterns

| Anti-pattern | Why it hurts |
| --- | --- |
| Hand-rolled `elasticsearch.search` to read a checkpoint | Reimplements a stock step, and typically addresses the document by a derived ID that does not exist |
| Treating an empty checkpoint as success | Hides a wrong-ID bug as a permanent full sync |
| `while` without `max-iterations` | One bad cursor consumes the entire rate-limit budget |
| No `concurrency` guard | Overlapping runs double-ingest and double-spend |
| Checkpoint advanced before indexing | A failed write silently drops records |
| Descending sort with a watermark | Skips records on interruption |
| Per-document `elasticsearch.index` in a `foreach` | Order-of-magnitude slower than one bulk call |

## Related

- [Fleet package authoring guide (Kibana-only ETL)](./kibana_only_etl_package_authoring.md)
- [Placeholder substitution convention](./placeholder_substitution_convention.md)
- [GitHub action-connector vs content-connector decision guide](./github_connector_decision_guide.md)
