# @kbn/alerting-v2-schemas — API and schema design guide

Zod schemas and shared types for the alerting v2 HTTP API, plus the rules for
designing that API. Read this before adding or changing a route, a request
schema, or a response schema.

## 1. Purpose

These rules are the result of several full audits of the alerting v2 API
surface. They are decisions, not suggestions: follow them as written, and if a
rule needs to change, change it here first so the API stays consistent. The
public surface is frozen at GA — anything listed as *breaking* in §9 needs a
new API version — so get the schema right before the route ships.

## 2. Resource model and naming

Resources are plural nouns under one base path per resource. Path constants
live in `@kbn/alerting-v2-constants`; never inline a path string.

| Resource | Public path | Internal path |
|---|---|---|
| Rule | `/api/alerting/v2/rules` | `/internal/alerting/v2/rules` (`tags`, `_match`) |
| Action policy | `/api/alerting/v2/action_policies` | `/internal/alerting/v2/action_policies/_match` |
| Alert | `/api/alerting/v2/alerts` | — |
| Series | — | `/internal/alerting/v2/series` |
| Execution history | `/api/alerting/v2/execution_history/{rules,action_policies}` | — |
| Change history, templates, suggestions | — | `/internal/alerting/v2/…` |

Naming rules:

- Every key, query parameter, path parameter and enum value is `snake_case`:
  `and`/`or`, `catch_all`, `sort_field` — never `AND`, `catch-all`,
  `sortField`.
- One name for one concept across every resource; different names for
  different things. Canonical vocabulary:

| Concept | Name | Not |
|---|---|---|
| Collection in a response | `items` | `rules`, `policies`, `results` |
| Match count | `total` (estimate, see §6) | `total_events`, `count` |
| Sorting | `sort_field`, `sort_order` (`asc`/`desc`) | `sort`, `order` |
| Time bounds | `from`, `to` | `start_date`, `start_time` |
| Snooze expiry | `snoozed_until` | `expiry`, `snooze_expiry` |
| Audit | `created_by`, `created_at`, `updated_by`, `updated_at` | `creator`, `timestamp` |
| On/off | `enabled` | `disabled`, `active` |
| Labels | `tags` | `labels` |
| The thing a rule produces | `alert` | `episode` (internal term only) |
| Path parameter for the id | `{id}` | `{rule_id}`, `{alert_id}` |
| Exact counts | `<noun>_count` | `total_<noun>` (reserved for estimates) |

- Identifiers are opaque strings. Server ids are UUID v4. Client-chosen ids go
  through `entityIdSchema`: `^[a-zA-Z0-9_-]+$`, 1–150 chars, permanent, never
  reused, documented with `ENTITY_ID_NOTE`. Only `PUT /{id}` and
  `_bulk_create` items accept a client id.
- Reference fields are `{ type, id }` discriminated unions, not `<noun>_id`,
  so new target types are additive (action policy `destinations[]` is
  `{ type: 'workflow', id }`).
- Rich objects over primitive soup: `schedule`, `throttle`, `matcher`,
  `timings`, `error` are objects, not flattened prefixes.

## 3. Standard methods

All five plus Replace exist on rules and action policies. Every public route
sets `access: 'public'` explicitly; the base default is `internal`.

| Method | Route | Success | Body | Rules |
|---|---|---|---|---|
| Create | `POST /rules` | `201` | resource | Server id. Returns the created resource. |
| Replace / create by id | `PUT /rules/{id}` | `200` replaced, `201` created | resource | Full create schema; `kind` immutable → `409 IMMUTABLE_FIELDS_CHANGED`. |
| Get | `GET /rules/{id}` | `200` | resource | Id only, no side effects. |
| List | `GET /rules` | `200` | `{ items, total, page, per_page }` | See §6. |
| Update | `PATCH /rules/{id}` | `200` | resource | Partial; `null` clears a field; arrays are replaced whole. Lifecycle fields (`enabled`, `snoozed_until`) are **not** updatable here — they are custom methods. |
| Delete | `DELETE /rules/{id}` | `204` | — | Second call is `404`. |

- There is no optimistic-concurrency `version` on the wire. `409` on a
  standard update means a concurrent server-side write; clients retry.
- Response shape is identical for create, get, update, replace and every list
  item: one `*ResponseSchema` per resource, reused everywhere.
- Responses never carry secrets or server bookkeeping (`api_key`, `auth`,
  `owner`). Rotate credentials via `_update_api_key`, which returns the
  resource, not the key.

```jsonc
// POST /api/alerting/v2/action_policies            → 201
{ "name": "On-call", "destinations": [{ "type": "workflow", "id": "wf-1" }],
  "matcher": { "tags": ["prod"] }, "throttle": { "strategy": "interval", "interval": "5m" } }

// response — same shape as GET; unset fields are absent, never null
{ "id": "3f1c…", "name": "On-call", "enabled": true,
  "destinations": [{ "type": "workflow", "id": "wf-1" }],
  "matcher": { "tags": ["prod"] }, "throttle": { "strategy": "interval", "interval": "5m" },
  "created_by": { "profile_uid": "u_…" }, "created_at": "2026-10-05T09:00:00.000Z",
  "updated_by": { "profile_uid": "u_…" }, "updated_at": "2026-10-05T09:00:00.000Z" }
```

## 4. Custom methods

A custom method is a state transition with side effects, or a computation
that no standard method expresses. It is always `POST`.

- Shape: `POST /{resource}/{id}/_<verb>` on one resource,
  `POST /{resource}/_<verb>` on the collection. The `_verb` separator is used
  everywhere; never `:verb` or a bare `/verb`.
- Imperative verb, no prepositions: `_enable`, `_snooze`, `_run`, `_match` —
  not `_match_for_rule`.
- Every binary transition ships with its inverse (`_enable`/`_disable`,
  `_snooze`/`_unsnooze`, `_ack`/`_unack`, `_activate`/`_deactivate`).
- Rule and action-policy transitions return `200` + the resource. `_run`
  returns `202` with no body; a disabled rule → `400 RULE_DISABLED`; already
  running → `409`.
- Alert verbs (`/alerts/{id}/_ack|_unack|_assign|_tag|_activate|_deactivate`)
  return `204` **permanently**; alert state is read via `GET /alerts/{id}`
  when it ships, not from the action response. A no-op (already acked, same
  assignee, same tag set, already active) returns `409` and writes nothing —
  no action document, no domain event. `_tag` **replaces** the set; `[]`
  clears. `_assign` with `assignee_uid: null` unassigns.
- Transition inputs live in the body (`snoozed_until`, `reason`, `tags`);
  the body is `.strict()` even when empty.

## 5. Bulk and by-query

Bulk methods target the collection, take identifiers in the body, and use
`POST`.

| Shape | Path | Request | Response |
|---|---|---|---|
| By id | `POST /rules/_bulk_<verb>` | `bulkByIdsSchema` `{ ids: [...] }`, 1–`MAX_BULK_ITEMS` | `200` `bulkResponseSchema` |
| Create | `POST /rules/_bulk_create` | `{ items: [createItem, …] }` sharing the single-create refinements | `200` `{ items, errors }` |
| Get | `POST /rules/_bulk_get` | `{ ids }` | `200` `{ items }` — **atomic and order-preserving**; one bad id fails the request |
| Alert actions | `POST /alerts/_bulk_<verb>` | `{ items: [{ id, …verb fields }] }` | `200` `bulkResponseSchema` |
| By query | `POST /rules/_<verb>_by_query` | `bulkByQuerySchema` `{ filter \| search \| match_all, force }` | `200` `dryRunResponseSchema` or `bulkResponseSchema` |

- Mutating bulks are partial-success, the Elasticsearch `_bulk` model.
  `bulkResponseSchema` is
  `{ affected_count, errors: [{ id, error: { code, message, details } }] }`.
  Two-tier rule: throw an HTTP error while nothing has been mutated (bad body,
  limit exceeded); once anything has been written, return `200` and report per
  item. `affected_count` and `errors` must always be truthful — a `200` may
  carry `affected_count: 0`. Say so in every bulk route description.
- By-query: `force` defaults to `false` and returns a dry run
  `{ match_count, sample }`; executing above `BULK_FILTER_MAX_RESOURCES` is
  rejected before any write; `match_all: true` is an explicit opt-in. Add a
  by-query method only where it is genuinely needed — today, rules.
- Envelopes are objects, never bare arrays. Request key is `ids` for by-id,
  `items` for anything carrying per-item data.

```jsonc
// POST /api/alerting/v2/rules/_bulk_disable
{ "ids": ["r-1", "r-2", "r-3"] }
// → 200
{ "affected_count": 2,
  "errors": [{ "id": "r-3", "error": { "code": "RULE_NOT_FOUND", "message": "…", "details": { "rule_id": "r-3" } } }] }
```

## 6. List: pagination, filtering, sorting, counts

- Offset pagination with `page` (default 1) and `per_page` (default 20, max
  `MAX_PER_PAGE` = 100). Both go through `queryIntSchema({ min, max })`;
  `per_page` min is 1 — never 0 as a mode switch; the schema refines
  `page * per_page ≤ 10_000` (the ES result window).
- `per_page` is a maximum: pages may be shorter than requested even when more
  exist. Say "up to" in the description.
- `total` is an **estimate** capped at 10 000 and every `total` carries
  `ESTIMATED_COUNT_NOTE`. Exact counts, where needed, are named
  `<noun>_count`.
- Filtering is one KQL string named `filter`, bounded by `MAX_KQL_LENGTH`,
  strict about allowed fields (`400` listing them), and evaluable from the
  resource alone. Filter field names are the wire names (`metadata.name`,
  `enabled`), never storage paths. Do not add typed filter params
  (`enabled=true`) beside `filter`.
- `search` is free text over resource-defined fields, bounded by
  `MAX_SEARCH_LENGTH`; one definition per resource, documented.
- Sorting is `sort_field` (an enum of wire field names) + `sort_order`.
- Repeated-value query params are plural (`rule_ids`, `outcomes`) and accept a
  single value or an array via `arrayOrSingleSchema`.

## 7. Errors and status codes

The contract is `errorResponseSchema` `{ code, error, message, details? }`:
branch on `code` (UPPER_SNAKE from `ALERTING_ERROR_CODES`), treat `error` and
`message` as human text, treat `details` as structured context whose keys are
`snake_case` and whose shape is fixed per `code`. Full catalog, fallbacks and
how to throw: [`server/lib/errors/README.md`](../../../../plugins/shared/alerting_v2/server/lib/errors/README.md).

Status code policy (changing one later is breaking):

| Code | When |
|---|---|
| `200` | Get, list, update, replace, transition returning the resource, every bulk |
| `201` | Create; replace that created |
| `202` | `_run` accepted |
| `204` | Delete; single alert actions |
| `400` | Schema failure (`BAD_REQUEST`, `details.errors` treeified) or a domain rule the client can fix now (`RULE_DISABLED`, `SCHEDULE_INTERVAL_TOO_SHORT`) |
| `403` | Missing privilege; licence not sufficient (`ACTION_POLICY_LICENSE_NOT_SUPPORTED`) |
| `404` | Resource in the path does not exist. Never for a failed precondition on an existing resource |
| `409` | Precondition failed on an existing resource: immutable field changed, already in target state, not the latest alert, concurrent write |

Every route declares its complete response map in `static schemas.response`:
each success code with its body, `400` with `errorResponseSchema` when it
validates input, and every domain code it can throw. `401/403/500/503` are
merged in by `BaseAlertingRoute`. Never advertise a code the handler cannot
produce.

## 8. Schema rules (zod)

- Request object schemas are `.strict()` so unknown keys fail fast and later
  additions are provably additive.
- Bound everything: strings `.max()`, arrays `.max()`, records by key count,
  numbers `.min()/.max()`, durations by `MAX_DURATION`. Use the `MAX_*`
  constants from `./constants` or `@kbn/alerting-v2-constants`; never an
  ad-hoc literal. Same concept, same bound everywhere.
- **Absent means unset. Responses never emit `null` for "no value."** Use
  `.optional()` on response fields. `null` is valid only in a request body
  and only means "clear this field" on PATCH (`.nullable().optional()` on the
  PATCH schema). `.nullable().optional()` on a *response* field is forbidden
  — three states for one concept. A field that is always `null` must be
  populated or removed.
- Request and response are different schemas. Build the response from the
  create base (`createRuleDataBaseSchema.extend(...)`) so round-tripping
  `GET → PUT` is valid without client-side cleanup.
- `.describe()` on every field, written for the API consumer: say the unit,
  the default, the bound, and what absence means.
  `.meta({ id: 'alerting_<noun>_<shape>' })` on every exported object schema;
  the id names the OAS component and generated SDK types, so it is part of
  the contract.
- Units in names: numeric durations end in `_ms`; human durations are strings
  like `5m`, `1h` via `durationSchema`. Timestamps are ISO 8601
  `z.iso.datetime()` named `*_at`.
- Enums are `snake_case` string literals. Booleans are positive (`enabled`,
  not `disabled`).
- Polymorphism is a `type`-discriminated union (`z.discriminatedUnion`), with
  the discriminator immutable after create. Open sets (artifact `type`) are
  validated strings, not enums.
- Shared primitives — reuse, do not redefine:

| Export | Purpose |
|---|---|
| `entityIdSchema`, `ENTITY_ID_NOTE` | Client-chosen ids: pattern, length, permanence note |
| `groupHashSchema` | 64-char lowercase hex SHA-256 |
| `durationSchema` | `5m`-style duration, bounded by `MAX_DURATION` |
| `tagsSchema` | `MAX_TAGS` × `MAX_TAG_LENGTH` labels |
| `actorSchema` | `created_by` / `updated_by` identity |
| `queryIntSchema({ min, max })` | Coerces a query-string integer and bounds it |
| `arrayOrSingleSchema(item, max)` | Repeated query param accepting one value or an array |
| `optionalWithDescription(schema)` | `.optional()` that keeps the description |
| `ESTIMATED_COUNT_NOTE` | Appended to every `total` description |
| `bulkByIdsSchema`, `bulkByQuerySchema`, `bulkResponseSchema`, `dryRunResponseSchema`, `bulkByQueryResultSchema` | The one bulk envelope family |
| `errorResponseSchema` | The one error body |
| `validateDuration`, `validateEsqlQuery`, … | Refinement helpers behind the schemas above |

## 9. Access, stability, versioning

- `/api/` routes set `access: 'public'` explicitly; `/internal/` routes keep
  the base default `internal`; `route_access.test.ts` enforces the pairing.
  Anything a UI needs that is not ready to freeze stays internal.
- Every route declares `static security.authz.requiredPrivileges` from
  `ALERTING_V2_API_PRIVILEGES` (`rules`, `actionPolicies`, `alerts`,
  `executionHistory` × `read`/`write`). Writing a policy that references rules
  requires `rules.read` as well. Tightening a privilege later is breaking.
- `/v2/` is the version. There is no header versioning and no deprecation
  mechanism yet. `availability.stability` flips from `experimental` to stable
  at GA.
- Breaking after GA — any of: renaming or removing a key, enum value, path
  segment, path parameter or query parameter; changing a status code;
  changing a default; lowering a bound; changing `details` keys for a code;
  changing absent↔`null`; changing partial-success semantics; tightening a
  privilege; turning a `200` into a `400` by stricter validation.
  Non-breaking: adding an optional request field to a `.strict()` object,
  adding a response field, raising a bound, adding an error code, adding a
  route.


