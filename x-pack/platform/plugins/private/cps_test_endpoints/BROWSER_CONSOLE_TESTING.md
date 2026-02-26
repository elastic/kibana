# Testing with OAuth/SAML Authentication (Browser Console Method)

Since your serverless QA environment uses OAuth/SAML authentication (no username/password), all testing should be done through the **browser console**.

## Step-by-Step Guide

### 1. Deploy & Verify

1. **Deploy your changes** to QA serverless origin project
2. **Log into Kibana UI** using OAuth/SAML
3. **Check for beaker icon** 🧪 in the header (confirms deployment)
4. **Open browser console** (F12 or right-click → Inspect → Console tab)

### 2. Verify Plugin is Loaded

Paste this into browser console:

```javascript
fetch('/internal/cps_test/health')
  .then(r => r.json())
  .then(console.log)
```

**Expected**:
```json
{
  "status": "ok",
  "message": "CPS Test Endpoints plugin is running",
  "timestamp": "2026-02-26T..."
}
```

**If 404**: Plugin didn't load. Check Kibana logs.

### 3. Run All CPS Tests

Paste this into browser console:

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
      'keepbriando-cps-test-proj-linked-ce713c',  // Your linked project alias
      '_alias:_all'
    ]
  })
}).then(r => r.json()).then(data => {
  console.log('=== CPS Test Results ===');
  console.log('Summary:', data.summary);
  console.log('\nDetailed Results:');
  console.table(data.scenarios);
  console.log('\nFull data:', data);
  return data;
})
```

**Customize**:
- Replace `'keepbriando-cps-test-proj-linked-ce713c'` with your actual linked project alias
- Use indices that exist in your **origin** project (`.kibana`, `logs-*`, `metrics-*`, etc.)

### 4. Interpret Results

#### ✅ Success (Hypothesis Confirmed)

```javascript
{
  summary: { total: 4, passed: 4, failed: 0 },
  scenarios: [
    { success: true, statusCode: 200, ... },
    { success: true, statusCode: 200, ... }
  ]
}
```

**Meaning**:
- ✅ ES accepts `project_routing` from internal user
- ✅ No 400 Bad Request errors
- ✅ Hypothesis confirmed!

#### ❌ Failure (Bug Found)

```javascript
{
  summary: { total: 4, passed: 0, failed: 4 },
  scenarios: [
    { success: false, statusCode: 400, error: "Bad Request", ... }
  ]
}
```

**Meaning**:
- ❌ ES is rejecting `project_routing` from internal user
- ❌ Bug found - needs investigation

#### ⚠️ "Index Not Found" (Expected)

```javascript
{
  scenarios: [
    { success: false, error: "index_not_found_exception", ... }
  ]
}
```

**If this happens**: You probably used an index that only exists in the linked project. Use indices from your **origin** project instead.

### 5. Test Single Scenario (Optional)

For debugging specific cases:

```javascript
fetch('/internal/cps_test/run_scenario', {
  method: 'POST',
  headers: {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    index: '.kibana',
    projectRouting: 'keepbriando-cps-test-proj-linked-ce713c',
    query: { match_all: {} }
  })
}).then(r => r.json()).then(console.log)
```

## Why Browser Console?

**OAuth/SAML authentication**:
- ✅ Browser has authentication cookies automatically
- ✅ No need for username/password
- ✅ Works with all auth methods (OAuth, SAML, etc.)
- ✅ Easy to run and re-run tests

**curl with OAuth**:
- ❌ Would need to extract and pass OAuth tokens
- ❌ Complex token management
- ❌ Tokens expire quickly
- ❌ Not practical for manual testing

## Tips

1. **Keep console open**: Results will show immediately
2. **Use console.table()**: Makes results easier to read
3. **Save results**: Copy/paste output for documentation
4. **Re-run easily**: Use up arrow in console to repeat commands
5. **Check Network tab**: See actual HTTP requests/responses

## Common Issues

### Issue: "kbn-xsrf header required"
**Solution**: Header is included in the fetch call above. Make sure you copied the full command.

### Issue: "Unexpected token" error
**Solution**: Make sure you copied the entire JavaScript block, including all brackets.

### Issue: Network error / CORS
**Solution**: Make sure you're running this in the Kibana UI (not from external page). You must be logged into Kibana first.

### Issue: 404 Not Found
**Solution**: Plugin not loaded. Check:
- Deployment completed successfully
- Kibana restarted after deployment
- Plugin included in the build

## Next Steps

After testing:

1. **Document results** in your task/ticket
2. **Revert beaker logo** change
3. **Share findings** with team
4. **Clean up** test plugin if no longer needed

## Quick Reference

**Health Check**:
```javascript
fetch('/internal/cps_test/health').then(r => r.json()).then(console.log)
```

**Run All Tests**:
```javascript
fetch('/internal/cps_test/run_all', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemIndex: '.kibana',
    dataIndex: 'logs-*',
    projectRoutingValues: ['YOUR-LINKED-ALIAS']
  })
}).then(r => r.json()).then(data => { console.table(data.scenarios); return data; })
```

**Single Scenario**:
```javascript
fetch('/internal/cps_test/run_scenario', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    index: '.kibana',
    projectRouting: 'YOUR-LINKED-ALIAS'
  })
}).then(r => r.json()).then(console.log)
```

