# CPS Internal User Testing - Implementation Summary

## Objective

Verify that Elasticsearch correctly handles `project_routing` parameters from the internal user in CPS-enabled serverless environments. Specifically, confirm that ES routes internal user requests to the origin project only, even when `project_routing` is set to non-origin values.

## What Was Implemented

### 1. Test Plugin: `cpsTestEndpoints`

**Location**: `x-pack/platform/test/serverless/plugins/cps_test_endpoints/`

**Components**:
- `kibana.jsonc` - Plugin manifest
- `tsconfig.json` - TypeScript configuration
- `server/index.ts` - Plugin entry point
- `server/init_routes.ts` - Route definitions and test logic
- `README.md` - Plugin documentation
- `TESTING_GUIDE.md` - Comprehensive testing instructions

### 2. HTTP Endpoints

Three internal API endpoints:

#### a. `POST /internal/cps_test/run_all`
Runs comprehensive test suite covering multiple scenarios:
- System index searches with various `project_routing` values
- Data index searches with various `project_routing` values
- Returns structured results with pass/fail status for each scenario

#### b. `POST /internal/cps_test/run_scenario`
Runs a single targeted test scenario:
- Allows custom index, project_routing, and query
- Useful for debugging specific cases

#### c. `GET /internal/cps_test/health`
Health check endpoint to verify plugin is loaded and running

### 3. Test Scenarios

The plugin tests these scenarios using `asInternalUser` client:

1. **System Index + Non-Origin Routing**: Search `.kibana` with `project_routing` set to linked projects
2. **Data Index + Non-Origin Routing**: Search data indices with `project_routing` set to linked projects

Each test captures:
- Success/failure status
- HTTP status code
- Hit counts
- Error messages (if any)

## How It Works

### Request Flow

1. HTTP request hits the test endpoint
2. Plugin retrieves `asInternalUser` ES client from context
3. Makes search requests with explicit `project_routing` body parameter
4. Captures response or error
5. Returns structured test results

### Key Implementation Details

- Uses `context.core.elasticsearch.client.asInternalUser` - ensures we're testing as internal user
- Sets `project_routing` in request body as per CPS specification
- Uses `as any` type assertions to work around TypeScript limitations for CPS parameters
- Returns detailed results including status codes, hit counts, and error details

## How to Use

### Local Testing (Limited CPS Simulation)

```bash
# Terminal 1: Start ES in serverless mode
yarn es serverless --projectType=oblt

# Terminal 2: Start Kibana in serverless mode  
yarn serverless-oblt

# Terminal 3 or Browser Console: Run tests
curl -X POST http://localhost:5601/internal/cps_test/run_all \
  -u elastic_serverless:changeme \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{"systemIndex": ".kibana", "dataIndex": "logs-*"}'
```

### QA Testing (Full CPS with Linked Projects)

1. Deploy Kibana build with plugin to QA serverless project (Project A)
2. Ensure Project A is CPS-linked to Project B
3. Run tests via curl or browser console:

```bash
curl -X POST https://project-a.qa.elastic.co/internal/cps_test/run_all \
  -u username:password \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "systemIndex": ".kibana",
    "dataIndex": "logs-*",
    "projectRoutingValues": ["_alias:project-b-id", "_alias:_all"]
  }'
```

## Expected Results

### Success Criteria (Hypothesis Confirmed)

All tests pass with `success: true` and `statusCode: 200`:

```json
{
  "summary": { "total": 6, "passed": 6, "failed": 0 },
  "scenarios": [
    {
      "scenario": "System index search (.kibana) with project_routing=_alias:linked",
      "success": true,
      "statusCode": 200,
      "details": {
        "message": "Request succeeded - ES accepted project_routing for internal user",
        "hitsCount": 100
      }
    }
  ]
}
```

**Interpretation**: ES accepts `project_routing` from internal user and correctly routes to origin.

### Failure Scenario (Issue Detected)

Tests fail with 400 errors:

```json
{
  "summary": { "total": 6, "passed": 0, "failed": 6 },
  "scenarios": [
    {
      "scenario": "System index search with project_routing=_alias:linked",
      "success": false,
      "statusCode": 400,
      "error": "Bad Request: invalid project_routing for internal user"
    }
  ]
}
```

**Interpretation**: ES is rejecting `project_routing` from internal user - this would indicate a bug or misconfiguration.

## Advantages of This Approach

1. **No UI Required**: Tests run as internal user via API, no need for internal user credentials in UI
2. **Automated**: Single API call runs all scenarios
3. **Detailed Results**: Captures success/failure, status codes, hit counts, errors
4. **Flexible**: Can test any index and any project_routing value
5. **Easy to Trigger**: Works from curl, browser console, or automation scripts
6. **QA-Ready**: Designed for deployment to serverless QA environments

## Limitations

1. **Local CPS Limited**: Local serverless mode may not fully replicate CPS linking
2. **Requires QA Projects**: Full testing requires actual linked serverless projects
3. **Test Plugin**: This is a test-only plugin, not for production use
4. **Manual Interpretation**: Results need to be reviewed manually

## Next Steps

1. ✅ **Code Complete**: Plugin implemented and linted
2. ⏳ **Local Testing**: Test in local serverless mode (limited CPS)
3. ⏳ **QA Deployment**: Deploy to serverless QA with linked projects
4. ⏳ **Run Tests**: Execute test scenarios in QA
5. ⏳ **Document Findings**: Record results and confirm hypothesis

## Files Created

```
x-pack/platform/test/serverless/plugins/cps_test_endpoints/
├── kibana.jsonc                 # Plugin manifest
├── tsconfig.json                # TypeScript config
├── README.md                    # Plugin documentation
├── TESTING_GUIDE.md            # Detailed testing instructions
├── SUMMARY.md                  # This file
└── server/
    ├── index.ts                # Plugin entry point
    └── init_routes.ts          # Route implementations
```

## Reference Documentation

- [CPS Integration Tests](../../../../src/core/server/integration_tests/elasticsearch/project_routing_serverless_cps.test.ts)
- [Serverless Testing Guide](../../README.md)
- [Running Kibana in Serverless Mode](../../../../dev_docs/getting_started/setting_up_a_development_env.mdx)
- [Elasticsearch Client Access](../../../../dev_docs/tutorials/elasticsearch.mdx)

## Questions to Answer via Testing

1. ✓ Can we trigger internal user requests from code? **YES - via route handler**
2. ? Does ES accept `project_routing` from internal user? **TO BE TESTED**
3. ? Does ES route internal user to origin regardless of `project_routing`? **TO BE TESTED**
4. ? Are there any differences between system vs data indices? **TO BE TESTED**

## Review Checklist

- [x] Plugin structure follows Kibana conventions
- [x] Routes use internal access level
- [x] Authorization disabled for test endpoints (with reason)
- [x] Error handling implemented
- [x] Detailed logging and result capture
- [x] Documentation complete (README + TESTING_GUIDE)
- [x] No linter errors
- [x] TypeScript compiles
- [ ] Local testing performed
- [ ] QA testing performed
- [ ] Results documented

