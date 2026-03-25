# Testing: Watchlist Entity Source Infrastructure

## Prerequisites

1. **Entity Store is running** with seeded data (assumed ready).
2. **Kibana** running at `http://localhost:5601` with the feature flag enabled in `kibana.dev.yml`:
   ```yaml
   xpack.securitySolution.enableExperimental:
     - entityAnalyticsWatchlistEnabled
   ```
3. **Elasticsearch** running at `http://localhost:9200` (security disabled).

All `curl` commands below omit auth headers. If you have security enabled, add `-u elastic:changeme`.

Common headers used throughout:
```
-H 'kbn-xsrf: true' \
-H 'Content-Type: application/json' \
-H 'elastic-api-version: 2023-10-31'
```

---

## 1. Watchlist CRUD

### 1.1 Create a Watchlist

```bash
curl -s -X POST http://localhost:5601/api/entity_analytics/watchlists \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{
    "name": "High Risk Vendors",
    "description": "Test watchlist for entity source sync",
    "riskModifier": 1.5,
    "managed": false
  }' | jq .
```

**Expected**: 200 response with watchlist object containing `id`, `name`, `description`, `riskModifier`, `createdAt`, `updatedAt`.

Save the returned `id` for subsequent steps:
```bash
export WATCHLIST_ID="<id from response>"
```

### 1.2 Get a Watchlist

```bash
curl -s -X GET "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: Returns the watchlist object created above.

### 1.3 List Watchlists

```bash
curl -s -X GET http://localhost:5601/api/entity_analytics/watchlists/list \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: Array containing the created watchlist.

### 1.4 Update a Watchlist

```bash
curl -s -X PUT "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{
    "name": "High Risk Vendors - Updated",
    "riskModifier": 1.8
  }' | jq .
```

**Expected**: 200 with updated watchlist object. `updatedAt` should change.

---

## 2. Entity Source CRUD

### 2.1 Create an Index-type Entity Source

```bash
curl -s -X POST "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{
    "type": "index",
    "name": "My Custom Index Source",
    "indexPattern": "logs-*",
    "identifierField": "user.name",
    "enabled": true
  }' | jq .
```

**Expected**: 200 with entity source object containing `id`, `type: "index"`, `name`, `indexPattern`, `identifierField`.

```bash
export SOURCE_ID="<id from response>"
```

### 2.2 Create an Integration-type Entity Source (Okta)

> Only if you have an `entityanalytics_okta` integration installed.

```bash
curl -s -X POST "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{
    "type": "entity_analytics_integration",
    "name": "Okta Users",
    "integrationName": "entityanalytics_okta",
    "enabled": true
  }' | jq .
```

**Expected**: 200 with entity source object. `indexPattern` should be auto-derived.

### 2.3 List Entity Sources for a Watchlist

```bash
curl -s -X GET "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source/list" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: Array of entity sources linked to this watchlist.

### 2.4 Get a Single Entity Source

```bash
curl -s -X GET "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source/${SOURCE_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: The entity source object.

### 2.5 Update an Entity Source

```bash
curl -s -X PUT "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source/${SOURCE_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{
    "name": "My Custom Index Source - Updated",
    "indexPattern": "logs-custom-*"
  }' | jq .
```

**Expected**: 200 with updated entity source.

### 2.6 Delete an Entity Source

```bash
curl -s -X DELETE "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/entity_source/${SOURCE_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: 200. Source should be removed from the watchlist's references and the SavedObject deleted.

---

## 3. Sync

### 3.1 Trigger a Watchlist Sync

Before syncing, ensure you have at least one entity source linked to the watchlist (re-create one if you deleted it above).

```bash
curl -s -X POST "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}/sync" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

**Expected**: `{ "acknowledged": true }`

### 3.2 Verify Synced Entities

After sync, entities should be written to the watchlist's target index. Query Elasticsearch directly:

```bash
curl -s "http://localhost:9200/.entity-analytics.watchlists.*/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 10,
    "query": { "match_all": {} }
  }'
```

**Expected**: Documents with the structure:
- `entity.id` — the entity unique ID (EUID)
- `entity.type` — `user`, `host`, `service`, or `generic`
- `entity.name` — display name (if available)
- `labels.sources` — array of source names
- `labels.source_ids` — array of source IDs
- `@timestamp` — when the entity was synced
- `event.ingested` — ingestion timestamp

---

## 4. Edge Cases & Validation

### 4.1 Duplicate Watchlist Name

Try creating a second watchlist with the same name. Verify the behavior (should succeed — names are not unique constraints on watchlists themselves, but entity source names within a watchlist are).

### 4.2 Duplicate Entity Source Name

Create two entity sources with the same `name` on the same watchlist. **Expected**: Second creation should fail with a conflict error (name uniqueness is enforced).

### 4.3 Delete a Managed Entity Source

If you have a managed entity source (`managed: true`), attempt to delete it. **Expected**: Should be rejected.

### 4.4 Sync with No Entity Sources

Create a watchlist with no linked entity sources and trigger sync. **Expected**: `{ "acknowledged": true }` with no errors (no-op).

### 4.5 Sync with Entity Store Empty

If the entity store has no data matching the source's identifier field, sync should complete without errors and produce no documents.

---

## 5. Cleanup

### Delete the Watchlist

```bash
curl -s -X DELETE "http://localhost:5601/api/entity_analytics/watchlists/${WATCHLIST_ID}" \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 2023-10-31' | jq .
```

### Verify Target Index Cleanup (if applicable)

```bash
curl -s "http://localhost:9200/.entity-analytics.watchlists.*/_count"
```
