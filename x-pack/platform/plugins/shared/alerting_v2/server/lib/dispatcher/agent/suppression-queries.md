# Suppression Queries

Given the dispatcher query results (the alert episodes the dispatcher is working with), we need to determine for each episode whether it should be suppressed or not.

## Dispatcher query results

Query:
```
POST /_query?format=csv
{
  "query": """
   FROM .alerts-events,.alerts-actions METADATA _index
      | WHERE (_index LIKE ".ds-.alerts-actions-*") OR (_index LIKE ".ds-.alerts-events-*" and type == "alert")
      | EVAL 
          rule_id = COALESCE(rule.id, rule_id),
          episode_id = COALESCE(episode.id, episode_id),
          episode_status = episode.status
      | DROP episode.id, rule.id, episode.status
      | INLINE STATS last_fired = max(last_series_event_timestamp) WHERE _index LIKE ".ds-.alerts-actions-*" AND action_type == "fire-event" BY rule_id, group_hash
      | WHERE (last_fired IS NULL OR last_fired < @timestamp) or (_index LIKE ".ds-.alerts-actions-*")
      | STATS
          last_event_timestamp = MAX(@timestamp) WHERE _index LIKE ".ds-.alerts-events-*"
          BY rule_id, group_hash, episode_id, episode_status
      | WHERE last_event_timestamp IS NOT NULL
      | KEEP last_event_timestamp, rule_id, group_hash, episode_id, episode_status
      | SORT last_event_timestamp asc
      | LIMIT 10000
 """
}
```

The dispatcher query (see [alerts-events-and-actions-dataset.md](./alerts-events-and-actions-dataset.md)) returns the following 10 alert episodes:

```
last_event_timestamp,rule_id,group_hash,episode_id,episode_status
2026-01-27T16:00:00.000Z,rule-003,rule-003-series-2,rule-003-series-2-episode-1,active
2026-01-27T16:05:00.000Z,rule-003,rule-003-series-2,rule-003-series-2-episode-1,inactive
2026-01-27T16:15:00.000Z,rule-003,rule-003-series-1,rule-003-series-1-episode-1,active
2026-01-27T16:15:00.000Z,rule-005,rule-005-series-2,rule-005-series-2-episode-1,active
2026-01-27T16:15:00.000Z,rule-003,rule-003-series-2,rule-003-series-2-episode-2,active
2026-01-27T16:15:00.000Z,rule-004,rule-004-series-1,rule-004-series-1-episode-1,active
2026-01-27T16:15:00.000Z,rule-005,rule-005-series-1,rule-005-series-1-episode-1,active
2026-01-27T16:15:00.000Z,rule-004,rule-004-series-2,rule-004-series-2-episode-1,active
2026-01-27T16:15:00.000Z,rule-002,rule-002-series-1,rule-002-series-1-episode-1,active
2026-01-27T16:15:00.000Z,rule-001,rule-001-series-1,rule-001-series-1-episode-1,active
```

## Suppression types

A suppression can happen because of three action types, each with different scoping:

| Suppression type | Scope | Suppressed when |
| --- | --- | --- |
| **Ack** | `(rule_id, group_hash, episode_id)` | Last action in `ack`/`unack` pair is `ack` |
| **Deactivate** | `(rule_id, group_hash, episode_id)` | Last action in `deactivate`/`activate` pair is `deactivate` |
| **Snooze** | `(rule_id, group_hash)` | Last action in `snooze`/`unsnooze` pair is `snooze` AND expiry > alert event timestamp |

> Note: Snooze has no `episode_id` — it applies to the entire `group_hash` (all episodes for that series).

## Expected suppression results

Based on the actions in the dataset:

| rule_id | group_hash | episode_id | suppressed? | reason |
| --- | --- | --- | --- | --- |
| rule-001 | rule-001-series-1 | rule-001-series-1-episode-1 | no | ack at 16:03 then unack at 16:08 |
| rule-002 | rule-002-series-1 | rule-002-series-1-episode-1 | **yes** | ack at 16:03, no unack after |
| rule-003 | rule-003-series-1 | rule-003-series-1-episode-1 | no | no actions |
| rule-003 | rule-003-series-2 | rule-003-series-2-episode-1 | no | no actions |
| rule-003 | rule-003-series-2 | rule-003-series-2-episode-2 | no | no actions |
| rule-004 | rule-004-series-1 | rule-004-series-1-episode-1 | **yes** | snoozed at 16:03, expiry 2026-01-28 > event time 16:15 |
| rule-004 | rule-004-series-2 | rule-004-series-2-episode-1 | **yes** | snoozed at 16:03, expiry 2026-01-28 > event time 16:15 |
| rule-005 | rule-005-series-1 | rule-005-series-1-episode-1 | **yes** | deactivated at 16:08, no activate after |
| rule-005 | rule-005-series-2 | rule-005-series-2-episode-1 | no | no actions |


---

## Query 1: Ack suppression

Ack suppression is scoped to `(rule_id, group_hash, episode_id)`. An episode is suppressed if the last action between `ack` and `unack` is `ack`.

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE action_type IN ("ack", "unack")
      | STATS last_action_type = LAST(action_type, @timestamp) BY rule_id, group_hash, episode_id
      | EVAL suppressed_by_ack = last_action_type == "ack"
      | KEEP rule_id, group_hash, episode_id, suppressed_by_ack
  """
}
```

### Expected result

```
rule_id,group_hash,episode_id,suppressed_by_ack
rule-001,rule-001-series-1,rule-001-series-1-episode-1,false
rule-002,rule-002-series-1,rule-002-series-1-episode-1,true
```

> Episodes not present in the result have no `ack`/`unack` actions and should be assumed **not suppressed** by ack.

- **rule-001**: ack at 16:03, then unack at 16:08 → last action is `unack` → `suppressed_by_ack = false`
- **rule-002**: ack at 16:03, no unack → last action is `ack` → `suppressed_by_ack = true`


---

## Query 2: Deactivate suppression

Deactivate suppression is scoped to `(rule_id, group_hash, episode_id)`. An episode is suppressed if the last action between `deactivate` and `activate` is `deactivate`.

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE action_type IN ("deactivate", "activate")
      | STATS last_action_type = LAST(action_type, @timestamp) BY rule_id, group_hash, episode_id
      | EVAL suppressed_by_deactivate = last_action_type == "deactivate"
      | KEEP rule_id, group_hash, episode_id, suppressed_by_deactivate
  """
}
```

### Expected result

```
rule_id,group_hash,episode_id,suppressed_by_deactivate
rule-005,rule-005-series-1,rule-005-series-1-episode-1,true
```

> Episodes not present in the result have no `deactivate`/`activate` actions and should be assumed **not suppressed** by deactivate.

- **rule-005 series-1**: deactivate at 16:08, no activate after → last action is `deactivate` → `suppressed_by_deactivate = true`


---

## Query 3: Snooze suppression

Snooze suppression is scoped to `(rule_id, group_hash)` — it has no `episode_id`. All episodes of a snoozed series are suppressed. A series is suppressed if the last action between `snooze` and `unsnooze` is `snooze` **and** the snooze expiry is still valid.

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE (action_type == "snooze" AND expiry > now()) OR action_type == "unsnooze"
      | STATS last_action_type = LAST(action_type, @timestamp) BY rule_id, group_hash
      | EVAL suppressed_by_snooze = last_action_type == "snooze"
      | KEEP rule_id, group_hash, suppressed_by_snooze
  """
}
```

### Note on expiry comparison

The snooze expiry for rule-004 is `2026-01-28T16:03:00.000Z`. If running today (`now()` > expiry), the `expiry > now()` filter will exclude the snooze action and the query will return no results — the snooze appears expired.

In the real dispatcher context, the comparison should be `expiry > last_event_timestamp` (the alert episode's event timestamp), not `now()`. Since the alert events for rule-004 are at `2026-01-27T16:15:00.000Z`, and the expiry is `2026-01-28T16:03:00.000Z`, the snooze is still active for those episodes.

For testing with this dataset, you can replace `now()` with a hardcoded timestamp:

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE (action_type == "snooze" AND expiry > "2026-01-27T16:15:00.000Z"::datetime) OR action_type == "unsnooze"
      | STATS last_action_type = LAST(action_type, @timestamp) BY rule_id, group_hash
      | EVAL suppressed_by_snooze = last_action_type == "snooze"
      | KEEP rule_id, group_hash, suppressed_by_snooze
  """
}
```

### Expected result (with valid expiry)

```
rule_id,group_hash,suppressed_by_snooze
rule-004,rule-004-series-1,true
rule-004,rule-004-series-2,true
```

> Series not present in the result have no active `snooze`/`unsnooze` actions and should be assumed **not suppressed** by snooze.

- **rule-004 series-1**: snooze at 16:03 with expiry 2026-01-28, no unsnooze → last action is `snooze` → `suppressed_by_snooze = true`
- **rule-004 series-2**: snooze at 16:03 with expiry 2026-01-28, no unsnooze → last action is `snooze` → `suppressed_by_snooze = true`


---

## Combined query: all 3 suppression types at once

The challenge with combining all three suppression types is the different grouping granularity:
- **Ack** and **Deactivate** group BY `(rule_id, group_hash, episode_id)`
- **Snooze** groups BY `(rule_id, group_hash)` only — snooze actions have no `episode_id`

A single `STATS ... BY rule_id, group_hash, episode_id` groups snooze rows under `episode_id = NULL`, separate from ack/deactivate rows that carry an `episode_id`. This works correctly: snooze results appear at the `group_hash` level (with `episode_id = NULL`), while ack/deactivate results appear at the `episode_id` level.

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")
      | WHERE action_type != "snooze" OR expiry > "2026-01-27T16:15:00.000Z"::datetime
      | STATS 
          last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
          last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
          last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze")
        BY rule_id, group_hash, episode_id
      | EVAL should_suppress = CASE(
          last_snooze_action == "snooze", true,
          last_ack_action == "ack", true,
          last_deactivate_action == "deactivate", true,
          false
        )
      | KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action
  """
}
```

### Expected result

```
rule_id,group_hash,episode_id,should_suppress,last_ack_action,last_deactivate_action,last_snooze_action
rule-001,rule-001-series-1,rule-001-series-1-episode-1,false,unack,,
rule-002,rule-002-series-1,rule-002-series-1-episode-1,true,ack,,
rule-004,rule-004-series-1,,true,,,snooze
rule-004,rule-004-series-2,,true,,,snooze
rule-005,rule-005-series-1,rule-005-series-1-episode-1,true,,deactivate,
```

> Episodes/series not present in the result have no suppression actions and should be assumed **not suppressed**.

- **rule-001**: last ack action is `unack` → `should_suppress = false`
- **rule-002**: last ack action is `ack` → `should_suppress = true`
- **rule-004 series-1**: last snooze action is `snooze` (expiry still valid) → `should_suppress = true` (episode_id is NULL — snooze applies to all episodes in the series)
- **rule-004 series-2**: same as series-1 → `should_suppress = true`
- **rule-005 series-1**: last deactivate action is `deactivate` → `should_suppress = true`

### Note on snooze `episode_id`

Snooze rows appear with `episode_id = NULL` because snooze actions are scoped to `group_hash`, not to a specific episode. The consumer of these results needs to match snooze suppression by `(rule_id, group_hash)` rather than by `episode_id`.

### Edge case: mixed snooze + ack/deactivate on the same group_hash

If a `group_hash` has both snooze and ack/deactivate actions, the simple query above produces separate rows: one with `episode_id = NULL` (snooze) and one with the actual `episode_id` (ack/deactivate). The episode-level row won't reflect the snooze status.

To propagate snooze status to episode-level rows, use `INLINE STATS` to first compute snooze at the `group_hash` level before the final `STATS`:

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-actions
      | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")
      | WHERE action_type != "snooze" OR expiry > "2026-01-27T16:15:00.000Z"::datetime
      | INLINE STATS 
          last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze") 
          BY rule_id, group_hash
      | STATS 
          last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
          last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
          last_snooze_action = MAX(last_snooze_action)
        BY rule_id, group_hash, episode_id
      | EVAL should_suppress = CASE(
          last_snooze_action == "snooze", true,
          last_ack_action == "ack", true,
          last_deactivate_action == "deactivate", true,
          false
        )
      | KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action
  """
}
```

With `INLINE STATS`, the snooze status is computed first and added to every row for that `(rule_id, group_hash)`. Then when `STATS` groups by `episode_id`, each episode-level group carries the snooze status. This ensures that if a series is both snoozed and acked, the episode-level row correctly shows `should_suppress = true` (from snooze).

With the current dataset both queries produce the same result since no group_hash has both snooze and ack/deactivate actions.


---

## Combined query with alerts-events: dynamic snooze expiry comparison

The combined queries above use a hardcoded timestamp (`"2026-01-27T16:15:00.000Z"::datetime`) for the snooze expiry comparison. In the real dispatcher context, the snooze expiry should be compared against the **alert episode's event timestamp** — not a static value or `now()`.

To achieve this, we query both `.alerts-events` and `.alerts-actions` in a single ES|QL query:

1. Read from both indices (same as the dispatcher query)
2. Apply the **fire-event filter** — use `INLINE STATS` to find the last `fire-event` per `(rule_id, group_hash)` and only consider alert events that haven't been fired yet
3. Compute `last_event_timestamp` per `(rule_id, group_hash)` from the alert events using `INLINE STATS`
4. Filter down to action rows only, and use the dynamically computed `last_event_timestamp` for the snooze expiry comparison
5. Compute all 3 suppression types as before

```
POST /_query?format=csv
{
  "query": """
    FROM .alerts-events, .alerts-actions METADATA _index
      | WHERE (_index LIKE ".ds-.alerts-actions-*") 
         OR (_index LIKE ".ds-.alerts-events-*" AND type == "alert")
      | EVAL 
          rule_id = COALESCE(rule.id, rule_id),
          episode_id = COALESCE(episode.id, episode_id)
      | DROP rule.id, episode.id
      | INLINE STATS 
          last_fired = MAX(last_series_event_timestamp) WHERE _index LIKE ".ds-.alerts-actions-*" AND action_type == "fire-event" 
          BY rule_id, group_hash
      | WHERE (last_fired IS NULL OR last_fired < @timestamp) OR (_index LIKE ".ds-.alerts-actions-*")
      | INLINE STATS 
          last_event_timestamp = MAX(@timestamp) WHERE _index LIKE ".ds-.alerts-events-*" 
          BY rule_id, group_hash
      | WHERE _index LIKE ".ds-.alerts-actions-*"
      | WHERE action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")
      | WHERE action_type != "snooze" OR expiry > last_event_timestamp
      | INLINE STATS 
          last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze") 
          BY rule_id, group_hash
      | STATS 
          last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
          last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
          last_snooze_action = MAX(last_snooze_action),
          last_event_timestamp = MAX(last_event_timestamp)
        BY rule_id, group_hash, episode_id
      | EVAL should_suppress = CASE(
          last_snooze_action == "snooze", true,
          last_ack_action == "ack", true,
          last_deactivate_action == "deactivate", true,
          false
        )
      | KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action, last_event_timestamp
  """
}
```

### How it works step by step

1. **Read both indices** — `FROM .alerts-events, .alerts-actions METADATA _index` reads from both datasets. The `METADATA _index` allows us to distinguish which index each row comes from.

2. **Normalize field names** — Alert events store the rule id as `rule.id` and episode id as `episode.id`, while actions store them as `rule_id` and `episode_id`. The `COALESCE` + `DROP` normalizes these into consistent field names.

3. **Fire-event filter** — The `INLINE STATS last_fired = MAX(last_series_event_timestamp) WHERE action_type == "fire-event"` computes the last fired event timestamp per `(rule_id, group_hash)`. The subsequent `WHERE` clause filters out alert events that have already been fired by a previous dispatcher run, while keeping all action rows. With the current dataset, there are no `fire-event` actions, so `last_fired` is NULL and all events pass through.

4. **Compute `last_event_timestamp`** — `INLINE STATS last_event_timestamp = MAX(@timestamp) WHERE _index LIKE ".ds-.alerts-events-*" BY rule_id, group_hash` attaches the latest alert event timestamp to every row for that `(rule_id, group_hash)`. This is the timestamp we compare against the snooze expiry.

5. **Filter to actions only** — After computing `last_event_timestamp`, we keep only the action rows (`WHERE _index LIKE ".ds-.alerts-actions-*"`) and filter to the relevant suppression action types.

6. **Dynamic snooze expiry check** — `WHERE action_type != "snooze" OR expiry > last_event_timestamp` replaces the hardcoded timestamp. Snooze actions are only kept if their expiry is after the latest alert event timestamp for that group_hash.

7. **Compute suppression** — Same logic as the previous combined queries: `INLINE STATS` for snooze at the `group_hash` level, then `STATS` for ack/deactivate at the `episode_id` level.

### Note on fire-event filter

The current dataset has no `fire-event` actions (those are written by the dispatcher after processing). As a result, `last_fired` is NULL for all `(rule_id, group_hash)` pairs, and the filter passes all events through. In production, this filter ensures only unfired alert events contribute to the `last_event_timestamp` computation — avoiding re-processing episodes already handled by a previous dispatcher run.

### Expected result

```
rule_id,group_hash,episode_id,should_suppress,last_ack_action,last_deactivate_action,last_snooze_action,last_event_timestamp
rule-001,rule-001-series-1,rule-001-series-1-episode-1,false,unack,,,2026-01-27T16:15:00.000Z
rule-002,rule-002-series-1,rule-002-series-1-episode-1,true,ack,,,2026-01-27T16:15:00.000Z
rule-004,rule-004-series-1,,true,,,snooze,2026-01-27T16:15:00.000Z
rule-004,rule-004-series-2,,true,,,snooze,2026-01-27T16:15:00.000Z
rule-005,rule-005-series-1,rule-005-series-1-episode-1,true,,deactivate,,2026-01-27T16:15:00.000Z
```

> Episodes/series not present in the result have no suppression actions and should be assumed **not suppressed**.

The results are identical to the previous combined queries, but now with `last_event_timestamp` included to show which alert event timestamp was used for the snooze comparison. The key difference is that the snooze expiry is compared dynamically against the actual alert event timestamps from the `.alerts-events` index, rather than requiring a hardcoded value.

- **rule-001**: last ack action is `unack` → `should_suppress = false` (last_event_timestamp = 16:15)
- **rule-002**: last ack action is `ack` → `should_suppress = true` (last_event_timestamp = 16:15)
- **rule-004 series-1**: snooze expiry `2026-01-28T16:03:00.000Z` > last_event_timestamp `2026-01-27T16:15:00.000Z` → snooze is active → `should_suppress = true`
- **rule-004 series-2**: same as series-1 → `should_suppress = true`
- **rule-005 series-1**: last deactivate action is `deactivate` → `should_suppress = true` (last_event_timestamp = 16:15)
