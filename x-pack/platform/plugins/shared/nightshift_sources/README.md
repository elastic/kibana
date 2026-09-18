# Nightshift Sources

A **source** is the unit of work every Nightshift engine consumes: a space-scoped saved object
holding an ES|QL query, materialised as the ES|QL view `$.nightshift.sources.<slug>`. Engines
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
| `GET` | `/internal/nightshift/sources?page&per_page&search&enabled` | read | Paginated catalog, sorted by title. Does not fetch views. |
| `POST` | `/internal/nightshift/sources` | manage | Validates the query, writes the saved object, creates the view |
| `GET` | `/internal/nightshift/sources/{sourceId}` | read | Source plus view health, including a `FROM <view> \| LIMIT 0` probe for `unresolvable` |
| `PUT` | `/internal/nightshift/sources/{sourceId}` | manage | Full replace of `title`, `description`, `tags`, `esql`; always re-puts the view |
| `DELETE` | `/internal/nightshift/sources/{sourceId}` | manage | Deletes the view (404 ignored), then the saved object |
| `POST` | `/internal/nightshift/sources/{sourceId}/_enable` | manage | Flips `enabled` only |
| `POST` | `/internal/nightshift/sources/{sourceId}/_disable` | manage | Flips `enabled` only |

There is no `_repair` endpoint: a `PUT` with the current values recreates a missing view or
overwrites a drifted one.

Wire schemas and types (`NightshiftSource`, `SourceHealth`, request/response shapes) live in
`@kbn/nightshift-shared` so browser code can import them. A typed repository client is exposed
on the public start contract through `getClient()`.

## Engine access

`start.getSourcesClient({ request })` is how other Nightshift plugins talk to the catalog
without going through HTTP. It returns the same client the routes use and does not re-check
`read_nightshift` / `manage_nightshift`. The hidden saved-object type already excludes the
security extension, so a check here would not restore SO authorization (that path rejects
everyone but superusers). Call it from a route that already requires those privileges.
`create` and `update` parse the same wire schemas as HTTP, so a blank title still 400s.

## Query validation

A source is rows only. On create and update the ES|QL must:

- parse without errors;
- start with `FROM` or `TS`;
- contain nothing but `WHERE` after the source command (this also rejects subqueries);
- not use `METADATA`, because ES|QL returns nulls for metadata columns read through a view;
- not reference a remote cluster (`cluster:index`), because views cannot target remote indices;
- not `FROM` a Nightshift source view, or a `$` wildcard that would match one (`$.nightshift.sources.*`,
  `$.nightshift.*`, `$.*`, `$.*.sources.*-*`), or the new view can match itself.

The view name is `$.nightshift.sources.<slug>`. `<slug>` is derived from the title at create
(`nginx-errors` from "Nginx errors") and never changes, even if the title does. If that name is
already taken — another source in any space, or an orphaned view — create walks `-2`, `-3`, …
The saved-object id stays a uuid; it is not in the view name.

Wildcards, several sources and date math are fine. Create always runs `<esql> | LIMIT 0` as
the calling user. Update does too when the normalized query changes. A title-only PUT, or a
repair that sends the stored query, skips that probe so a vanished `WHERE` field cannot block
rename or restoring a deleted view; GET reports `unresolvable` instead. A pattern that
matches no index yet is accepted, which means field names in `WHERE` are only checked once
data exists.

## Health

Health is computed on `GET /{sourceId}` only. List is the saved-object catalog and does not
fetch views; engines query `FROM <view>` and will fail at query time if the view is gone.

| Value | Meaning |
| --- | --- |
| `ok` | View exists and its query matches the stored ES|QL |
| `view_missing` | View was deleted out of band; `PUT` the current values to recreate it |
| `view_drift` | View exists but its query differs from the stored ES|QL; `PUT` fixes it |
| `unresolvable` | `FROM <view> \| LIMIT 0` fails with a 400 while indices exist behind the source, e.g. a `WHERE` field that no longer resolves |
| `unknown` | The view could not be read or probed (403, ES error); the source itself may be fine |

## Enablement model

`enabled` is a catalog-wide flag: a disabled source should produce nothing new anywhere in
Nightshift. This plugin only stores the flag. Engines read it (and `esql_updated_at`, which
moves only when the normalized query changes, and is monotonic so two edits in the same
millisecond still advance the cursor) and reconcile their own state: disable rules,
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
Readers only need `read` and `read_view_metadata` on the view names plus `read` on the data.
List still answers without those Elasticsearch privileges; `GET /{sourceId}` reports
`health: "unknown"`.

## Configuration

`xpack.nightshiftSources.enabled` defaults to `true`. Serverless turns it off for every
project type in `config/serverless.yml` and back on for Observability Complete in
`config/serverless.oblt.complete.yml`, mirroring `xpack.significantEvents.enabled`.

## Known limitations

- `PUT`, `_enable` and `_disable` pass the saved-object `version` they just read, so a concurrent
  write 409s. That OCC covers the saved object, not the view write that follows: two overlapping
  `PUT`s can land query B on the catalog and query A on the view. `GET` reports `view_drift`; a
  `PUT` of the current values repairs it. `DELETE` cannot take a version: Core's `soClient.delete`
  has no version option. A concurrent `PUT` can recreate the view after `DELETE` has removed it
  and still delete the catalog row, leaving an orphaned view.
- Create allocates the slug with a cross-space find then a view write, not an atomic reserve.
  Two concurrent POSTs of the same title can share a `view_name`; the later `putView` wins,
  `GET` reports `view_drift`, and a `PUT` of the earlier source's values repairs it.
- Deleting a space removes the saved objects but leaves their views behind. Nothing cleans
  orphaned `$.nightshift.sources.*` views yet. ES|QL views are cluster-global; the Spaces
  boundary is the saved object, not the view name.
- The saved objects security extension is excluded for this hidden type, so saved-object-level
  audit events are not emitted; HTTP audit events still are.
- Views show up in the ES|QL editor's source suggestions under their `$.nightshift.sources.<slug>` name.

## Development

```bash
node scripts/jest x-pack/platform/plugins/shared/nightshift_sources
node scripts/jest x-pack/platform/packages/shared/kbn-nightshift-shared
node scripts/type_check --project x-pack/platform/plugins/shared/nightshift_sources/tsconfig.json
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/nightshift_sources/test/scout/api/playwright.config.ts
```
