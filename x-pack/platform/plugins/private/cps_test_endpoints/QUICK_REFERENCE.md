# Quick Reference: Testing CPS Internal User in QA

## Your QA Setup

**Origin Project**: (where Kibana is running)  
**Linked Project Alias**: `keepbriando-cps-test-proj-linked-ce713c`  
**⚠️ Use indices from ORIGIN project**: `.kibana`, `logs-*`, etc. (not linked project indices!)

## Why Origin Project Indices?

Internal user requests are **always routed to origin**, regardless of `project_routing` value. If you specify an index that only exists in the linked project (like `kibana_sample_data_flights`), you'll get "index not found" - this is **correct behavior**, not a bug!

# CPS Test Endpoints Plugin - Quick Reference

## Prerequisites

- Deployed to QA serverless origin project
- Logged into Kibana UI (OAuth/SAML)
- Browser console open (F12)

## Quick Test Command

**Browser Console (Recommended for OAuth environments):**

```javascript
fetch('/internal/cps_test/run_all', {
  method: 'POST',
  headers: {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    systemIndex: '.kibana',
    dataIndex: 'logs-*',
    projectRoutingValues: [
      'keepbriando-cps-test-proj-linked-ce713c',
      '_alias:_all'
    ]
  })
}).then(r => r.json()).then(data => {
  console.log('CPS Test Results:');
  console.log('Summary:', data.summary);
  console.table(data.scenarios);
  return data;
})
```

**curl (only if you have basic auth credentials):**

```bash
curl -X POST https://YOUR-ORIGIN-PROJECT.qa.elastic.co/internal/cps_test/run_all \
  -u YOUR_USERNAME:YOUR_PASSWORD \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemIndex": ".kibana",
    "dataIndex": "logs-*",
    "projectRoutingValues": [
      "keepbriando-cps-test-proj-linked-ce713c",
      "_alias:_all"
    ]
  }' | jq '.'
```

**Note**: `.kibana` and `logs-*` should exist in your origin project.

## Expected Results

### ✅ Success (Hypothesis Confirmed)

```json
{
  "summary": { "total": 4, "passed": 4, "failed": 0 },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=keepbriando-cps-test-proj-linked-ce713c",
      "success": true,
      "statusCode": 200
    }
  ]
}
```

**Meaning**: ES accepts `project_routing` from internal user and routes to origin.

### ❌ Failure (Bug Found)

```json
{
  "summary": { "total": 4, "passed": 0, "failed": 4 },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=keepbriando-cps-test-proj-linked-ce713c",
      "success": false,
      "statusCode": 400,
      "error": "Bad Request"
    }
  ]
}
```

**Meaning**: ES is rejecting `project_routing` from internal user (bug!).

## What We're Testing

- **Internal user** (`asInternalUser`) making requests
- With `project_routing` set to **linked project alias**
- ES should **accept** the parameter (not reject with 400)
- ES should **route to origin** (ignore the routing value for internal user)

### Important Behavior

**Internal user + `project_routing` to linked project**:
1. ES accepts the request ✅ (doesn't return 400 Bad Request)
2. ES routes to origin only ✅ (ignores the routing for internal user)
3. If index exists in origin → Returns data ✅
4. If index doesn't exist in origin → Returns "index not found" ✅ (expected!)

**The test verifies #1 (ES accepts the parameter), NOT that internal user can access linked data.**

## Comparison to Your ESQL Query

| Your ESQL | This Test |
|-----------|-----------|
| `asCurrentUser` | `asInternalUser` |
| User permissions | System permissions |
| Actually crosses projects | Routes to origin only |

## Health Check

Before running tests, verify plugin is loaded:

```bash
curl https://YOUR-PROJECT.qa.elastic.co/internal/cps_test/health \
  -u YOUR_USERNAME:YOUR_PASSWORD
```

Expected: `{"status": "ok", ...}`

## Troubleshooting

- **404**: Plugin not loaded → Check deployment
- **401**: Wrong credentials
- **400**: Check JSON format and include `kbn-xsrf: true` header
- **"index not found" in results**: If the index only exists in linked project (not origin), this is **expected** - internal user can't see linked data. Use indices from origin project for meaningful tests (e.g., `.kibana`, `logs-*`).

## After Testing

Document your findings:
- All tests passed? → Hypothesis confirmed ✅
- Tests failed with 400? → Bug found, ES rejects internal user + project_routing ❌
- Mixed results? → Document which scenarios pass/fail

