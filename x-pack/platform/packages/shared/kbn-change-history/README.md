# @kbn/change-history

Generic change-history storage and query for Kibana.

Persists point-in-time snapshots of object changes to Elasticsearch data streams, with optional diff metadata (what changed between consecutive versions).

Solution-agnostic: use it from any plugin or module that needs audit-style history.

---

## Overview

**One client per (module, dataset)**:

- Each client writes to a single data stream: `.kibana-change-history-{module}-{dataset}`.

**Log changes** with `log` / `logBulk`:

- Pass a **change** (or array of changes) and an **options** object. Each change has `objectType`, `objectId`, and `after` (post-change snapshot); optional change `id`, `sequence`, and `before` (pre-change snapshot).
- When `change.before` is provided, a diff is computed (using the optional custom `diffDocCalculation` or a default).

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
  Writes one change document. `change` must have `objectType`, `objectId`, and `after` (post-change snapshot); optional change `id`, `sequence`, and `before` (pre-change snapshot; used to compute diff fields when provided). `opts` is `LogChangeHistoryOptions` (see below).

- **`logBulk(changes, opts)`**
  Same as `log` for multiple changes in one bulk request. When `changes.length > 1`, documents are grouped with a shared event group id (or `opts.correlationId` if provided). `opts` is the same `LogChangeHistoryOptions` object.

- **`LogChangeHistoryOptions`** — Options for logging a change. Required: `action`, `userId`, `spaceId`. Optional: `timestamp` (ISO8601 string; defaults to now), `correlationId` (groups bulk events when set), change `data` (partial `event`, `tags`, and `metadata` to merge into the document), `ignoreFields` (nested key/value map of fields to ignore in the diff calculation), `maskFields` (nested key/value map of “sensitive” fields to mask instead of storing data in plain form), `diffDocCalculation` (function `(opts: ChangeTrackingDiffOptions) => ChangeTrackingDiff`; when omitted, a default diff is used).

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
| `object.hash`      | `keyword`          | SHA256 of the `object.snapshot` to identify changes in the payload.                                            |
| `object.sequence`  | `keyword`          | Sequence identifier for ordering. (Optional)                                                      |
| `object.fields`    | `object`           | Categorization of field names affected by the change. (Optional)                                  |
| `object.fields.changed` | `keyword`     | List of field names that changed. (Optional)                                                      |
| `object.fields.masked`  | `keyword`     | List of field names that were masked. (Optional)                                                  |
| `object.fields.ignored` | `keyword`     | List of field names that were ignored in the diff. (Optional)                                     |
| `object.oldvalues` | `object` (dynamic) | Previous values for changed fields. (Optional)                                                    |
| `object.snapshot`  | `object` (dynamic) | Full snapshot after the change. (Optional)                                                        |
| `tags`             | `keyword`          | Optional list of tags for the event.                                                              |
| `metadata`         | `object` (dynamic) | Optional metadata about the event; information that does not form part of the diff or ECS schema. |
| `kibana`           | `object`           | Kibana context.                                                                                   |
| `kibana.space_id`  | `keyword`          | ID of the space that the event belongs to.                                                        |
| `kibana.version`   | `keyword`          | Version of Kibana that the event belongs to.                                                      |

Variable-shape fields (`object.oldvalues`, `object.snapshot`, `metadata`) are currently mapped as objects with empty `properties`; the index does not use `dynamic: true`, so only explicitly mapped fields are indexed.

### Dependencies

See [tsconfig.json](tsconfig.json) for internal kibana references.

---

## Usage examples

### Basic usage (no frills)

```ts
import { ChangeHistoryClient } from '@kbn/change-history';
import type { ObjectChange, LogChangeHistoryOptions } from '@kbn/change-history';

// During plugin `setup()` phase
const client = new ChangeHistoryClient({
  module: 'security',
  dataset: 'detections',
  logger,
  kibanaVersion: '9.4.0',
});

// During plugin `start()` phase
await client.initialize(elasticsearchClient);

// When user makes a change
const change: ObjectChange = {
  objectType: 'alerting-rule',
  objectId: ruleId,
  after: ruleSnapshot, // <-- Version after changes, the raw object we use for reverting
};
await client.log(change, {
  action: 'rule-create',
  userId,
  spaceId,
});

// When reading history for an object
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId);
console.log(
  `Change tracking started on ${startDate}, we have ${total} items, latest change at: \n${JSON.stringify(items[0]?.['@timestamp'])}`
);
```

### Object update with diff

```ts
// After an object update (diff is computed from before → after):
const change: ObjectChange = {
  objectType: 'alerting-rule',
  objectId: ruleId,
  before: previousSnapshot, // <-- optional; if set, diff is computed
  after: ruleSnapshot,
};
await client.log(change, {
  action: 'rule-update',
  userId,
  spaceId,
});

// Read history for an object
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId);
const { object } = items.shift();
console.log(
  `We have just updated the following fields: \n${object.fields?.changed}`
);
```

### Bulk changes with correlation ID

Multiple changes in one request share a group id so they can be queried together. Pass a `correlationId` or let the client generate one when `changes.length > 1`:

```ts
const changes: ObjectChange[] = [
  { objectType: 'alerting-rule', objectId: id1, before: before1, after: after1 },
  { objectType: 'alerting-rule', objectId: id2, before: before2, after: after2 },
];
await client.logBulk(changes, {
  action: 'rule-bulk-update',
  userId,
  spaceId,
  correlationId: 'my-bulk-operation-123',
});
```

### Adding tags, reason, and metadata

Use `data` to set `event` fields (e.g. `reason`), `tags`, and `metadata` on the stored document:

```ts
await client.log(
  {
    objectType: 'alerting-rule',
    objectId: ruleId,
    before: previousSnapshot,
    after: newSnapshot,
  },
  {
    action: 'rule-update',
    userId,
    spaceId,
    data: {
      event: { reason: 'Threshold adjusted by user' },
      tags: ['new-rules-ui', 'manual-edit'],
      metadata: { tab: 'settings' },
    },
  }
);
```

### Ignored and masked fields

Dealing with domain-specific data that should be ignored in the diff or masked in the stored snapshot.

```ts
await client.log(change, {
  action: 'rule-update',
  userId,
  spaceId,
  // Fields that should not participate in the diff (e.g. volatile or system fields)
  ignoreFields: {
    updatedAt: true,
    monitoringData: true,
    params { isUpdated: true },
  },
  // Fields containing sensitive data that should be masked
  maskFields: {
    user: { email: true },
    apiKey: true,
  },
});
```

### Logging a deletion

Store the last known state as the snapshot and mark the event as a deletion:

```ts
await client.log(changes, {
  action: 'rule-delete',
  userId,
  spaceId,
  data: { event: { type: 'deletion', reason: 'User requested deletion' } },
});
```

### Querying with filters and pagination

```ts
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId, {
  additionalFilters: [{ range: { '@timestamp': { lt: '2026-01-01' } } }],
  size: 50,
  from: 0,
});
console.log(
  `Last update in 2025 was at ${items[0]?.['@timestamp']}`
);
```

---

## Installation

This is an internal Kibana package.
