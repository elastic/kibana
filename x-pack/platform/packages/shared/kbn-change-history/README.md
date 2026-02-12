# @kbn/change-history

Generic change-history storage and query for Kibana.

Persists point-in-time snapshots of object changes to Elasticsearch data streams, with optional diff metadata (what changed between consecutive versions).

Solution-agnostic: use it from any plugin or module that needs audit-style history.

---

## Overview

**One client per (module, dataset)**:

- Each client writes to a single data stream: `.kibana-change-history-{module}-{dataset}`.

**Log changes** with `log` / `logBulk`:

- Pass a **change** (or array of changes) and an **options** object. Each change has `id`, `type`, `next` (post-change snapshot), and optional `current` (pre-change snapshot).
- When `change.current` is provided, a diff is computed (using the optional custom `diffDocCalculation` or a default).

**Query history** with `getHistory(objectType, objectId, opts?)`:

- Returns change documents for the given object `type` and `id`, sorted by `@timestamp` then `event.id` descending. Supports pagination and custom sort/filters via `opts`.

All persisted documents follow the same schema (see below).

---

## API

### Client

- **`new ChangeHistoryClient({ module, dataset, logger, kibanaVersion })`**
  Constructs a client for the given `module`, `dataset`, and `kibanaVersion`. Use one client per (module, dataset).

- **`dataStreamName`** (read-only) — The data stream name used by this client (e.g. `.kibana-change-history-{module}-{dataset}`).

- **`isInitialized()`** — Returns `true` if the client has been initialized (e.g. after `initialize()` has been called).

- **`initialize(elasticsearchClient)`**
  Creates/ensures the data stream and stores the internal client. Call once before `log` / `logBulk` / `getHistory`.

- **`log(change, opts)`**
  Writes one change document. `change` must have `id`, `type`, and `next` (post-change snapshot); `current` (pre-change snapshot) is optional and used to compute diff fields when provided. `opts` is `LogChangeHistoryOptions` (see below).

- **`logBulk(changes, opts)`**
  Same as `log` for multiple changes in one bulk request. When `changes.length > 1`, documents are grouped with a shared event group id (or `opts.correlationId` if provided). `opts` is the same `LogChangeHistoryOptions` object.

- **`LogChangeHistoryOptions`** — Options for logging a change. Required: `action`, `userId`, `spaceId`. Optional: `correlationId` (groups bulk events when set), `overrides` (partial `event` and `metadata` to merge into the document), `excludeFields` (nested key/value map to exclude fields from the diff), `sensitiveFields` (nested key/value map for fields to hash instead of store in plain form), `diffDocCalculation` (function `(opts: ChangeTrackingDiffOptions) => ChangeTrackingDiff`; when omitted, a default diff is used).

- **`getHistory(objectType, objectId, opts?)`**
  Returns a promise with `{ startDate?, total, items }`. Filters by `object.type` and `object.id`. Optional `opts` is `GetChangeHistoryOptions`: `additionalFilters` (array of ES query clauses), pagination options `sort`, `from`, `size` (default 100), `transportOpts`. Results are sorted by `@timestamp` then `event.id` descending by default.

### Elasticsearch mapping schema

The data stream uses `dynamic: false` and the following index mapping (defined by `changeHistoryMappings` in the package):

| Field              | Type               | Description                                                                                       |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| `@timestamp`       | `date`             | ISO8601 Timestamp of the change.                                                                  |
| `user`             | `object`           | Who performed the change.                                                                         |
| `user.id`          | `keyword`          | Unique identifier for the user.                                                                   |
| `user.name`        | `keyword`          | Name of the user at the time of the change. (Optional)                                            |
| `user.email`       | `keyword`          | Email address of the user at the time of the change. (Optional)                                   |
| `user.ip`          | `keyword`          | IP address of the user at the time of the change. (Optional)                                      |
| `event`            | `object`           | Event metadata.                                                                                   |
| `event.id`         | `keyword`          | Unique identifier for the event.                                                                  |
| `event.module`     | `keyword`          | Kibana module that the event belongs to (e.g. `security`, etc.).                                  |
| `event.dataset`    | `keyword`          | Name of the dataset that the event belongs to (e.g. `alerting-rules`, etc.).                      |
| `event.action`     | `keyword`          | The action performed (`rule-create`, `rule-update`, `rule-delete`, etc.).                         |
| `event.type`       | `keyword`          | ECS categorization of the event performed (`creation`, `change`, `deletion`).                     |
| `event.outcome`    | `keyword`          | ECS outcome of the event (`success`).                                                              |
| `event.reason`     | `text`             | Reason for the change. (Optional)                                                                 |
| `event.start`      | `date`             | ISO8601 timestamp of the event start time. (Optional)                                             |
| `event.created`    | `date`             | ISO8601 timestamp of the event creation time. (Optional)                                          |
| `event.ingested`   | `date`             | ISO8601 timestamp of the event ingestion time. (Optional)                                         |
| `event.duration`   | `long`             | Duration of the event in milliseconds. (Optional)                                                 |
| `event.group`      | `object`           | Optional group for bulk operations.                                                               |
| `event.group.id`   | `keyword`          | ID shared between events that take place as a group. (Optional)                                   |
| `object`           | `object`           | The tracked object.                                                                               |
| `object.id`        | `keyword`          | Unique id of the target object in Kibana.                                                         |
| `object.type`      | `keyword`          | Type of the target object in Kibana.                                                              |
| `object.hash`      | `keyword`          | Hash of the `object.snapshot` to identify the payload.                                 |
| `object.changes`   | `keyword`          | List of field names that changed. (Optional)                                                      |
| `object.oldvalues` | `object` (dynamic) | Previous values for changed fields. (Optional)                                                    |
| `object.snapshot`  | `object` (dynamic) | Full snapshot after the change. (Optional)                                                        |
| `metadata`         | `object` (dynamic) | Optional metadata about the event; information that does not form part of the diff or ECS schema. |
| `kibana`           | `object`           | Kibana context.                                                                                   |
| `kibana.space_id`  | `keyword`          | ID of the space that the event belongs to.                                                        |
| `kibana.version`   | `keyword`          | Version of Kibana that the event belongs to.                                                      |

Variable-shape fields (`object.oldvalues`, `object.snapshot`, `metadata`) are currently mapped as objects with empty `properties`; the index does not use `dynamic: true`, so only explicitly mapped fields are indexed.

### Dependencies

See [tsconfig.json](tsconfig.json) for internal kibana references.

---

## Usage example

```ts
import { ChangeHistoryClient } from '@kbn/change-history';
import type { ObjectChange, LogChangeHistoryOptions } from '@kbn/change-history';

const client = new ChangeHistoryClient({
  module: 'my-module',
  dataset: 'my-dataset',
  logger,
  kibanaVersion: '9.4.0',
});
await client.initialize(elasticsearchClient);

// After an object create/update:
const change: ObjectChange = {
  id: ruleId,
  type: 'alerting-rule',
  current: previousSnapshot, // optional; if set, diff is computed
  next: newSnapshot,
};
const opts: LogChangeHistoryOptions = {
  action: 'rule-update',
  userId,
  spaceId,
  excludeFields: { someEphemeralField: false },
  diffDocCalculation: myDiffFn, // optional
};
await client.log(change, opts);

// To read history for an object
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId);

// With options (filters, pagination):
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId, {
  additionalFilters: [{ range: { '@timestamp': { gte: '2024-01-01' } } }],
  size: 50,
  from: 0,
});

console.log(
  `Change tracking started on ${startDate}, there are currently ${total} versions available, the last item was modified on ${items[0]?.['@timestamp']}`
);
```

---

## Installation

This is an internal Kibana package.
