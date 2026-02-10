# @kbn/change-history

Generic change-history storage and query for Kibana.

Persists point-in-time snapshots of object changes to Elasticsearch data streams, with optional diff metadata (what changed between consecutive versions).

Solution-agnostic: use it from any plugin or module that needs audit-style history.

---

## Overview

**One client per (module, dataset)**: 

- Each client writes to a single data stream: `.kibana-change-history-{module}-{dataset}`.

**Log changes** with `logChange` / `logBulkChange`: 

- Pass **object data** and an **options** object.
- When `objectData.current` is provided, a diff is computed (using the optional custom `diffDocCalculation` or a default).

**Query history** with `getHistory(objectType, objectId, additionalFilters?)`:

- To get change documents for that object (newest first), optionally narrowed by extra ES query filters.

All persisted documents follow the same schema (see below).

---

## API

### Client

- **`new ChangeTrackingClient(module, dataset, logger)`**  
  Constructs a client for the given `module` and `dataset`. Use one client per (module, dataset).

- **`initialize(elasticsearchClient)`**  
  Creates/ensures the data stream and stores the internal client. Call once before `logChange` / `logBulkChange` / `getHistory`.

- **`logChange(objectData, opts)`**  
  Writes one change document. `objectData` must have `id`, `type`, and `next` (post-change snapshot); `current` (pre-change snapshot) is optional and used to compute diff fields when provided. `opts` is `LogChangeHistoryOptions` (see below).

- **`logBulkChange(objects, opts)`**  
  Same as `logChange` for multiple objects in one bulk request. When `objects.length > 1`, documents are grouped with a shared event group id. `opts` is the same `LogChangeHistoryOptions` object.

- **`LogChangeHistoryOptions`** — Options for logging a change. Required: `action`, `userId`, `spaceId`, `kibanaVersion`, and `diffDocCalculation` (a function `(params: ChangeTrackingDiffParameters) => ChangeTrackingDiff`). Optional: `overrides` (partial change document), `excludeFilter` (nested key/value map to exclude fields from the diff). At runtime the implementation uses a default diff when `diffDocCalculation` is not provided.

- **`getHistory(objectType, objectId, additionalFilters?)`**  
  Returns a promise with `{ startDate?, total, items }` for the given object, sorted by `@timestamp` descending. Optional `additionalFilters` is an array of Elasticsearch query clause objects (`QueryDslQueryContainer[]`) that are combined with the object id/type filters (e.g. to filter by date range or user).

### Elasticsearch mapping schema

The data stream uses `dynamic: false` and the following index mapping (defined by `changeHistoryMappings` in the package):

| Field | Type | Description |
|-------|------|-------------|
| `@timestamp` | `date` | ISO8601 Timestamp of the change. |
| `user` | `object` | Who performed the change. |
| `user.id` | `keyword` | Unique identifier for the user. |
| `user.name` | `keyword` | Name of the user at the time of the change. (Optional) |
| `user.email` | `keyword` | Email address of the user at the time of the change. (Optional) |
| `user.ip` | `keyword` | IP address of the user at the time of the change. (Optional) |
| `event` | `object` | Event metadata. |
| `event.id` | `keyword` | Unique identifier for the event. |
| `event.module` | `keyword` | Kibana module that the event belongs to (e.g. `security`, etc.). |
| `event.dataset` | `keyword` | Name of the dataset that the event belongs to (e.g. `alerting-rules`, etc.). |
| `event.action` | `keyword` | The action performed (`rule-create`, `rule-update`, `rule-delete`, etc.). |
| `event.type` | `keyword` | ECS categorization of the event performed (`creation`, `change`, `deletion`). |
| `event.outcome` | `keyword` | ECS outcome of the event (`success`, `failure`, `unknown`). |
| `event.reason` | `text` | Reason for the change. (Optional) |
| `event.start` | `date` | ISO8601 timestamp of the event start time. (Optional) |
| `event.created` | `date` | ISO8601 timestamp of the event creation time. (Optional) |
| `event.ingested` | `date` | ISO8601 timestamp of the event ingestion time. (Optional) |
| `event.duration` | `long` | Duration of the event in milliseconds. (Optional) |
| `event.group` | `object` | Optional group for bulk operations. |
| `event.group.id` | `keyword` | ID shared between events that take place as a group. (Optional) |
| `object` | `object` | The tracked object. |
| `object.id` | `keyword` | Unique id of the target object in Kibana. |
| `object.type` | `keyword` | Type of the target object in Kibana. |
| `object.hash` | `keyword` | A hash of the object.snapshot to identify the payload. |
| `object.changes` | `keyword` | List of field names that changed. (Optional) |
| `object.oldvalues` | `object` (dynamic) | Previous values for changed fields. (Optional) |
| `object.snapshot` | `object` (dynamic) | Full snapshot after the change. (Optional) |
| `metadata` | `object` (dynamic) | Optional metadata about the event; information that does not form part of the diff or ECS schema. |
| `kibana` | `object` | Kibana context. |
| `kibana.space_id` | `keyword` | ID of the space that the event belongs to. |
| `kibana.version` | `keyword` | Version of Kibana that the event belongs to. |

Variable-shape fields (`object.oldvalues`, `object.snapshot`, `metadata`) are currently mapped as objects with empty `properties`; the index does not use `dynamic: true`, so only explicitly mapped fields are indexed.

### Dependencies

See [tsconfig.json](tsconfig.json) for internal kibana references.

---

## Usage example

```ts
import { ChangeTrackingClient } from '@kbn/change-history';
import type { ObjectData, LogChangeHistoryOptions } from '@kbn/change-history';

const client = new ChangeTrackingClient('my-module', 'my-dataset', logger);
await client.initialize(elasticsearchClient);

// After an object create/update:
const objectData: ObjectData = {
  id: ruleId,
  type: 'alerting-rule',
  current: previousSnapshot, // optional; if set, diff is computed
  next: newSnapshot,
};
const opts: LogChangeHistoryOptions = {
  action: 'rule-update',
  userId,
  objectData,
  spaceId,
  kibanaVersion,
  diffDocCalculation: myDiffFn, // optional diff calculation
  excludeFilter: { someEphemeralField: false },
};
await client.logChange(objectData, opts);

// To read history
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId);

// To read history (optionally with extra filters, e.g. date range):
const { startDate, total, items } = await client.getHistory('alerting-rule', ruleId, [{ range: { '@timestamp': { gte: '2024-01-01' } } }]);

console.log(`Change tracking started on ${startDate}, there are currently ${items.length} versions available`);
```

---

## Installation

This is an internal Kibana package. 
