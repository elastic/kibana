# Nightshift Sources

A **source** is the unit of work every Nightshift engine consumes: a space-scoped saved object
holding an ES|QL query, materialised as the ES|QL view `$.nightshift.sources.<id>`. Engines
(knowledge indicator onboarding, detection, investigation context) query the view, never the
raw ES|QL, so a source can be edited in one place and every consumer follows.

This plugin owns the `nightshift-source` saved object type, the view lifecycle and the
`/internal/nightshift/sources` API. It depends on no other Nightshift plugin, so any engine can
require it without creating a cycle.

## API

All routes are internal (`x-elastic-internal-origin: kibana`, `elastic-api-version: 1`) and
gated by the Nightshift feature privileges: reads need `read_nightshift`, writes need
`manage_nightshift`. `configure_nightshift` is never required.

| Method | Path | Privilege | Notes |
| --- | --- | --- | --- |
| `GET` | `/internal/nightshift/sources?page&per_page&search&enabled` | read | Paginated, sorted by title, each source with `health` |
| `POST` | `/internal/nightshift/sources` | manage | Validates the query, writes the saved object, creates the view |
| `GET` | `/internal/nightshift/sources/{sourceId}` | read | Also probes `FROM <view> \| LIMIT 0` for `unresolvable` |
| `PUT` | `/internal/nightshift/sources/{sourceId}` | manage | Full replace of `title`, `description`, `tags`, `esql`; always re-puts the view |
| `DELETE` | `/internal/nightshift/sources/{sourceId}` | manage | Deletes the saved object, then removes the view (best-effort) |
| `POST` | `/internal/nightshift/sources/{sourceId}/_enable` | manage | Flips `enabled` only |
| `POST` | `/internal/nightshift/sources/{sourceId}/_disable` | manage | Flips `enabled` only |

There is no `_repair` endpoint: a `PUT` with the current values recreates a missing view or
overwrites a drifted one.

Wire schemas and types (`NightshiftSource`, `SourceHealth`, request/response shapes) live in
`@kbn/nightshift-shared` so browser code can import them. A typed repository client is exposed
on the public start contract as `nightshiftSourcesRepositoryClient`.

## Query validation

A source is rows only. On create and update the ES|QL must:

- parse without errors;
- start with `FROM` or `TS`;
- contain nothing but `WHERE` after the source command (this also rejects subqueries);
- not use `METADATA`, because ES|QL returns nulls for metadata columns read through a view;
- not reference a remote cluster (`cluster:index`), because views cannot target remote indices.

Wildcards, several sources and date math are fine. The query is then executed as
`<esql> | LIMIT 0` as the calling user. A pattern that matches no index yet is accepted, which
means field names in `WHERE` are only checked once data exists; if they turn out wrong the
source's health becomes `unresolvable`.

## Health

| Value | Meaning |
| --- | --- |
| `ok` | View exists and its query matches the stored ES|QL |
| `view_missing` | View was deleted out of band; `PUT` the current values to recreate it |
| `view_drift` | View exists but its query differs from the stored ES|QL; `PUT` fixes it |
| `unresolvable` | `FROM <view> \| LIMIT 0` fails with a 400 while indices exist behind the source, e.g. a `WHERE` field that no longer resolves (only checked on `GET /{sourceId}`) |
| `unknown` | The view could not be read or probed (403, ES error); the source itself may be fine |

## Enablement model

`enabled` is a catalog-wide flag: a disabled source should produce nothing new anywhere in
Nightshift. This plugin only stores the flag. Engines read it (and `esql_updated_at`, which
moves only when the normalized query changes) and reconcile their own state: disable rules,
cancel onboarding, skip the source when picking candidates, re-onboard after a query change.
The plugin cannot call engines directly without reintroducing the dependency cycle it exists to
avoid; a lifecycle listener registry on the setup contract is the planned follow-up if the
reconcile latency turns out to matter.

## Elasticsearch privileges

The plugin runs every Elasticsearch call as the current user. Kibana feature privileges are
not enough on their own; users also need index privileges on the view names and on the data
the query reads. ES|QL view operations are index privileges applied to the view name.

```json
{
  "indices": [
    {
      "names": ["$.nightshift.sources.*"],
      "privileges": ["read", "manage"]
    },
    {
      "names": ["logs-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}
```

`manage` covers create, read-definition and delete. Where the cluster supports them,
`create_view`, `read_view_metadata` and `delete_view` are the least-privilege alternative.
Readers only need `read` and `read_view_metadata` on the view names plus `read` on the data;
without them the API still answers, with `health: "unknown"`.

## Configuration

`xpack.nightshiftSources.enabled` defaults to `true`. Serverless turns it off for every
project type in `config/serverless.yml` and back on for Observability Complete in
`config/serverless.oblt.complete.yml`, mirroring `xpack.significantEvents.enabled`.

## Known limitations

- `PUT`, `_enable` and `_disable` are last-write-wins; no optimistic concurrency.
- Deleting a space removes the saved objects but leaves their views behind. Nothing cleans
  orphaned `$.nightshift.sources.*` views yet.
- The saved objects security extension is excluded for this hidden type, so saved-object-level
  audit events are not emitted; HTTP audit events still are.
- Views show up in the ES|QL editor's source suggestions under their `$.nightshift.sources.<id>` name.

## Development

```bash
node scripts/jest x-pack/platform/plugins/shared/nightshift_sources
node scripts/type_check --project x-pack/platform/plugins/shared/nightshift_sources/tsconfig.json
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/nightshift_sources/test/scout/api/playwright.config.ts
```
