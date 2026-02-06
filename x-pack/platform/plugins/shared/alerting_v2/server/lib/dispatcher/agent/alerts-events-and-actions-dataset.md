# Alerts Events and Actions Dataset

This dataset contains sample alert events (`.alerts-events`) and user actions (`.alerts-actions`) for 4 rules, stored as an Elasticsearch bulk request. Alert events represent rule evaluation results emitted every 5 minutes, each belonging to a group (series) and an episode that tracks the lifecycle of a breach. Actions represent user or system responses to those alerts, such as acknowledging (`ack`), unacknowledging (`unack`), or snoozing (`snooze`) a specific series. The table below summarizes the full dataset: rows with an `event_timestamp` are alert events, while rows with an `action_timestamp` are actions applied between two consecutive events.

- **rule-001**: single series, acknowledged then unacknowledged between consecutive events.
- **rule-002**: single series, acknowledged with no further action changes.
- **rule-003**: two series -- series-1 stays active throughout; series-2 recovers and then starts a new episode.
- **rule-004**: two series, both snoozed (with an expiry) shortly after the first event.
- **rule-005**: two series -- series-1 is deactivated between consecutive events; series-2 stays active throughout.

| event_timestamp | rule_id | group_hash | episode_id | episode_status | status | action_timestamp | action_type | last_series_event_timestamp | expiry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16:00 | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 | active | breached |  |  |  |  |
|  | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 |  |  | 16:03 | ack | 16:00 |  |
| 16:05 | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 | active | breached |  |  |  |  |
|  | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 |  |  | 16:08 | unack | 16:05 |  |
| 16:10 | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 | active | breached |  |  |  |  |
|  | rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 |  |  | 16:03 | ack | 16:00 |  |
| 16:05 | rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 | active | breached |  |  |  |  |
| 16:10 | rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-003 | rule-003-series-1 | rule-003-series-1-episode-1 | active | breached |  |  |  |  |
| 16:05 | rule-003 | rule-003-series-1 | rule-003-series-1-episode-1 | active | breached |  |  |  |  |
| 16:10 | rule-003 | rule-003-series-1 | rule-003-series-1-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-003 | rule-003-series-1 | rule-003-series-1-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-003 | rule-003-series-2 | rule-003-series-2-episode-1 | active | breached |  |  |  |  |
| 16:05 | rule-003 | rule-003-series-2 | rule-003-series-2-episode-1 | inactive | recovered |  |  |  |  |
| 16:10 | rule-003 | rule-003-series-2 | rule-003-series-2-episode-2 | active | breached |  |  |  |  |
| 16:15 | rule-003 | rule-003-series-2 | rule-003-series-2-episode-2 | active | breached |  |  |  |  |
| 16:00 | rule-004 | rule-004-series-1 | rule-004-series-1-episode-1 | active | breached |  |  |  |  |
|  | rule-004 | rule-004-series-1 |  |  |  | 16:03 | snooze | 16:00 | 2026-01-28 16:03 |
| 16:05 | rule-004 | rule-004-series-1 | rule-004-series-1-episode-1 | active | breached |  |  |  |  |
| 16:10 | rule-004 | rule-004-series-1 | rule-004-series-1-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-004 | rule-004-series-1 | rule-004-series-1-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-004 | rule-004-series-2 | rule-004-series-2-episode-1 | active | breached |  |  |  |  |
|  | rule-004 | rule-004-series-2 |  |  |  | 16:03 | snooze | 16:00 | 2026-01-28 16:03 |
| 16:05 | rule-004 | rule-004-series-2 | rule-004-series-2-episode-1 | active | breached |  |  |  |  |
| 16:10 | rule-004 | rule-004-series-2 | rule-004-series-2-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-004 | rule-004-series-2 | rule-004-series-2-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 | active | breached |  |  |  |  |
| 16:05 | rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 | active | breached |  |  |  |  |
|  | rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 |  |  | 16:08 | deactivate | 16:05 |  |
| 16:10 | rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 | active | breached |  |  |  |  |
| 16:00 | rule-005 | rule-005-series-2 | rule-005-series-2-episode-1 | active | breached |  |  |  |  |
| 16:05 | rule-005 | rule-005-series-2 | rule-005-series-2-episode-1 | active | breached |  |  |  |  |
| 16:10 | rule-005 | rule-005-series-2 | rule-005-series-2-episode-1 | active | breached |  |  |  |  |
| 16:15 | rule-005 | rule-005-series-2 | rule-005-series-2-episode-1 | active | breached |  |  |  |  |

```
POST _bulk
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-001" },
    "group_hash": "rule-001-series-1",
    "episode": { "id": "rule-001-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:03:00.000Z",
    "actor": "elastic",
    "action_type": "ack",
    "last_series_event_timestamp": "2026-01-27T16:00:00.000Z",
    "rule_id": "rule-001",
    "group_hash": "rule-001-series-1",
    "episode_id": "rule-001-series-1-episode-1"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-001" },
    "group_hash": "rule-001-series-1",
    "episode": { "id": "rule-001-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:08:00.000Z",
    "actor": "elastic",
    "action_type": "unack",
    "last_series_event_timestamp": "2026-01-27T16:05:00.000Z",
    "rule_id": "rule-001",
    "group_hash": "rule-001-series-1",
    "episode_id": "rule-001-series-1-episode-1"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-001" },
    "group_hash": "rule-001-series-1",
    "episode": { "id": "rule-001-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-001" },
    "group_hash": "rule-001-series-1",
    "episode": { "id": "rule-001-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-002" },
    "group_hash": "rule-002-series-1",
    "episode": { "id": "rule-002-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:03:00.000Z",
    "actor": "elastic",
    "action_type": "ack",
    "last_series_event_timestamp": "2026-01-27T16:00:00.000Z",
    "rule_id": "rule-002",
    "group_hash": "rule-002-series-1",
    "episode_id": "rule-002-series-1-episode-1"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-002" },
    "group_hash": "rule-002-series-1",
    "episode": { "id": "rule-002-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-002" },
    "group_hash": "rule-002-series-1",
    "episode": { "id": "rule-002-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-002" },
    "group_hash": "rule-002-series-1",
    "episode": { "id": "rule-002-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-1",
    "episode": { "id": "rule-003-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-1",
    "episode": { "id": "rule-003-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-1",
    "episode": { "id": "rule-003-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-1",
    "episode": { "id": "rule-003-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-2",
    "episode": { "id": "rule-003-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-2",
    "episode": { "id": "rule-003-series-2-episode-1", "status": "inactive" },
    "status": "recovered"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-2",
    "episode": { "id": "rule-003-series-2-episode-2", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-2",
    "episode": { "id": "rule-003-series-2-episode-2", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-1",
    "episode": { "id": "rule-004-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:03:00.000Z",
    "actor": "elastic",
    "action_type": "snooze",
    "expiry": "2026-01-28T16:03:00.000Z",
    "last_series_event_timestamp": "2026-01-27T16:00:00.000Z",
    "rule_id": "rule-004",
    "group_hash": "rule-004-series-1"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-1",
    "episode": { "id": "rule-004-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-1",
    "episode": { "id": "rule-004-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-1",
    "episode": { "id": "rule-004-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-2",
    "episode": { "id": "rule-004-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:03:00.000Z",
    "actor": "elastic",
    "action_type": "snooze",
    "expiry": "2026-01-28T16:03:00.000Z",
    "last_series_event_timestamp": "2026-01-27T16:00:00.000Z",
    "rule_id": "rule-004",
    "group_hash": "rule-004-series-2"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-2",
    "episode": { "id": "rule-004-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-2",
    "episode": { "id": "rule-004-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-2",
    "episode": { "id": "rule-004-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-1",
    "episode": { "id": "rule-005-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-1",
    "episode": { "id": "rule-005-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-actions" } }
{
    "@timestamp": "2026-01-27T16:08:00.000Z",
    "actor": "elastic",
    "action_type": "deactivate",
    "last_series_event_timestamp": "2026-01-27T16:05:00.000Z",
    "rule_id": "rule-005",
    "group_hash": "rule-005-series-1",
    "episode_id": "rule-005-series-1-episode-1"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-1",
    "episode": { "id": "rule-005-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-1",
    "episode": { "id": "rule-005-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:00:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-2",
    "episode": { "id": "rule-005-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:05:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-2",
    "episode": { "id": "rule-005-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:10:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-2",
    "episode": { "id": "rule-005-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:15:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-2",
    "episode": { "id": "rule-005-series-2-episode-1", "status": "active" },
    "status": "breached"
}
```

## Sequence Diagrams (per rule)

### rule-001

Single series, acknowledged then unacknowledged between consecutive events.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant U as User
    participant S1 as rule-001-series-1

    RE->>S1: 16:00 breached (ep-1, active)
    U->>S1: 16:03 ack
    RE->>S1: 16:05 breached (ep-1, active)
    U->>S1: 16:08 unack
    RE->>S1: 16:10 breached (ep-1, active)
    RE->>S1: 16:15 breached (ep-1, active)
```

### rule-002

Single series, acknowledged with no further action changes.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant U as User
    participant S1 as rule-002-series-1

    RE->>S1: 16:00 breached (ep-1, active)
    U->>S1: 16:03 ack
    RE->>S1: 16:05 breached (ep-1, active)
    RE->>S1: 16:10 breached (ep-1, active)
    RE->>S1: 16:15 breached (ep-1, active)
```

### rule-003

Two series -- series-1 stays active throughout; series-2 recovers and then starts a new episode.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant S1 as rule-003-series-1
    participant S2 as rule-003-series-2

    RE->>S1: 16:00 breached (ep-1, active)
    RE->>S2: 16:00 breached (ep-1, active)
    RE->>S1: 16:05 breached (ep-1, active)
    RE->>S2: 16:05 recovered (ep-1, inactive)
    Note over S2: Episode 1 ends (recovered)
    RE->>S1: 16:10 breached (ep-1, active)
    RE->>S2: 16:10 breached (ep-2, active)
    Note over S2: New episode 2 starts
    RE->>S1: 16:15 breached (ep-1, active)
    RE->>S2: 16:15 breached (ep-2, active)
```

### rule-004

Two series, both snoozed (with an expiry) shortly after the first event.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant U as User
    participant S1 as rule-004-series-1
    participant S2 as rule-004-series-2

    RE->>S1: 16:00 breached (ep-1, active)
    RE->>S2: 16:00 breached (ep-1, active)
    U->>S1: 16:03 snooze (expiry: 2026-01-28 16:03)
    U->>S2: 16:03 snooze (expiry: 2026-01-28 16:03)
    RE->>S1: 16:05 breached (ep-1, active)
    RE->>S2: 16:05 breached (ep-1, active)
    RE->>S1: 16:10 breached (ep-1, active)
    RE->>S2: 16:10 breached (ep-1, active)
    RE->>S1: 16:15 breached (ep-1, active)
    RE->>S2: 16:15 breached (ep-1, active)
```

### rule-005

Two series -- series-1 is deactivated between consecutive events; series-2 stays active throughout.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant U as User
    participant S1 as rule-005-series-1
    participant S2 as rule-005-series-2

    RE->>S1: 16:00 breached (ep-1, active)
    RE->>S2: 16:00 breached (ep-1, active)
    RE->>S1: 16:05 breached (ep-1, active)
    RE->>S2: 16:05 breached (ep-1, active)
    U->>S1: 16:08 deactivate
    RE->>S1: 16:10 breached (ep-1, active)
    RE->>S2: 16:10 breached (ep-1, active)
    RE->>S1: 16:15 breached (ep-1, active)
    RE->>S2: 16:15 breached (ep-1, active)
```


## Combined Sequence Diagram

All rules and series in a single diagram, grouped by rule.

```mermaid
sequenceDiagram
    participant RE as RuleEngine
    participant U as User
    participant R1S1 as rule-001-series-1
    participant R2S1 as rule-002-series-1
    participant R3S1 as rule-003-series-1
    participant R3S2 as rule-003-series-2
    participant R4S1 as rule-004-series-1
    participant R4S2 as rule-004-series-2
    participant R5S1 as rule-005-series-1
    participant R5S2 as rule-005-series-2

    rect rgb(240, 240, 255)
    Note over RE,R1S1: rule-001
    RE->>R1S1: 16:00 breached (ep-1, active)
    U->>R1S1: 16:03 ack
    RE->>R1S1: 16:05 breached (ep-1, active)
    U->>R1S1: 16:08 unack
    RE->>R1S1: 16:10 breached (ep-1, active)
    RE->>R1S1: 16:15 breached (ep-1, active)
    end

    rect rgb(240, 255, 240)
    Note over RE,R2S1: rule-002
    RE->>R2S1: 16:00 breached (ep-1, active)
    U->>R2S1: 16:03 ack
    RE->>R2S1: 16:05 breached (ep-1, active)
    RE->>R2S1: 16:10 breached (ep-1, active)
    RE->>R2S1: 16:15 breached (ep-1, active)
    end

    rect rgb(255, 240, 240)
    Note over RE,R3S2: rule-003
    RE->>R3S1: 16:00 breached (ep-1, active)
    RE->>R3S2: 16:00 breached (ep-1, active)
    RE->>R3S1: 16:05 breached (ep-1, active)
    RE->>R3S2: 16:05 recovered (ep-1, inactive)
    Note over R3S2: Episode 1 ends
    RE->>R3S1: 16:10 breached (ep-1, active)
    RE->>R3S2: 16:10 breached (ep-2, active)
    Note over R3S2: New episode 2
    RE->>R3S1: 16:15 breached (ep-1, active)
    RE->>R3S2: 16:15 breached (ep-2, active)
    end

    rect rgb(255, 255, 230)
    Note over RE,R4S2: rule-004
    RE->>R4S1: 16:00 breached (ep-1, active)
    RE->>R4S2: 16:00 breached (ep-1, active)
    U->>R4S1: 16:03 snooze (expiry: 2026-01-28 16:03)
    U->>R4S2: 16:03 snooze (expiry: 2026-01-28 16:03)
    RE->>R4S1: 16:05 breached (ep-1, active)
    RE->>R4S2: 16:05 breached (ep-1, active)
    RE->>R4S1: 16:10 breached (ep-1, active)
    RE->>R4S2: 16:10 breached (ep-1, active)
    RE->>R4S1: 16:15 breached (ep-1, active)
    RE->>R4S2: 16:15 breached (ep-1, active)
    end

    rect rgb(240, 255, 255)
    Note over RE,R5S2: rule-005
    RE->>R5S1: 16:00 breached (ep-1, active)
    RE->>R5S2: 16:00 breached (ep-1, active)
    RE->>R5S1: 16:05 breached (ep-1, active)
    RE->>R5S2: 16:05 breached (ep-1, active)
    U->>R5S1: 16:08 deactivate
    RE->>R5S1: 16:10 breached (ep-1, active)
    RE->>R5S2: 16:10 breached (ep-1, active)
    RE->>R5S1: 16:15 breached (ep-1, active)
    RE->>R5S2: 16:15 breached (ep-1, active)
    end
```

## Dataset follow-up

A follow-up `_bulk` request that adds one more evaluation tick at `16:20` for every currently active episode across all existing rules, plus a brand-new rule (`rule-006`) with a single series appearing for the first time.

```
POST _bulk
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-001" },
    "group_hash": "rule-001-series-1",
    "episode": { "id": "rule-001-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-002" },
    "group_hash": "rule-002-series-1",
    "episode": { "id": "rule-002-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-1",
    "episode": { "id": "rule-003-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-003" },
    "group_hash": "rule-003-series-2",
    "episode": { "id": "rule-003-series-2-episode-2", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-1",
    "episode": { "id": "rule-004-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-004" },
    "group_hash": "rule-004-series-2",
    "episode": { "id": "rule-004-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-1",
    "episode": { "id": "rule-005-series-1-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-005" },
    "group_hash": "rule-005-series-2",
    "episode": { "id": "rule-005-series-2-episode-1", "status": "active" },
    "status": "breached"
}
{ "create": { "_index": ".alerts-events" } }
{
    "@timestamp": "2026-01-27T16:20:00.000Z", "source": "internal", "type": "alert",
    "rule": { "id": "rule-006" },
    "group_hash": "rule-006-series-1",
    "episode": { "id": "rule-006-series-1-episode-1", "status": "active" },
    "status": "breached"
}
```


## Trigger dispatcher manually

Use the following workflow to exercise the dispatcher against the two datasets above and verify the suppress/fire decisions at each step.

### Step 1 -- Ingest the initial dataset

Run the first `POST _bulk` request (the one containing events from `16:00` to `16:15` plus all actions) to populate `.alerts-events` and `.alerts-actions`.

### Step 2 -- Run the dispatcher (first pass)

```bash
curl --request POST \
  --url http://localhost:5601/internal/alerting/v2/dispatcher/_run \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --header 'x-elastic-internal-origin: kibana' \
  --data '{
	"previousStartedAt": "2026-01-25T00:00:00.000Z"
}'
```

### Step 3 -- Assert first-pass results

Verify that the dispatcher produced the expected suppress/fire events for every series across rule-001 through rule-005.

### Step 4 -- Ingest the follow-up dataset

Run the second `POST _bulk` request (the "Dataset follow-up" section -- events at `16:20` for all active episodes plus the new rule-006).

### Step 5 -- Run the dispatcher (second pass)

```bash
curl --request POST \
  --url http://localhost:5601/internal/alerting/v2/dispatcher/_run \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --header 'x-elastic-internal-origin: kibana' \
  --data '{
	"previousStartedAt": "2026-01-27T16:15:00.000Z"
}'
```

### Step 6 -- Assert second-pass results

Verify that the dispatcher produced the expected suppress/fire events for the `16:20` tick, including the newly introduced rule-006 series.