# MCP Integration End-to-End Test Plan

This document outlines the manual testing procedure to validate the complete MCP connector integration with OneChat.

## Prerequisites

1. **Kibana running** with enterprise license
2. **MCP connector configured** in Stack Management
3. **Agent Builder enabled**: `agentBuilder:enabled` = true
4. **User with privileges**: `onechat:read` and `onechat:manage`

## Test Scenarios

### 1. MCP Connector Discovery

**Objective**: Verify MCP connectors can be listed via API

**Steps**:
```bash
# List all MCP connectors
curl -X GET "http://localhost:5601/internal/agent_builder/mcp/connectors" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
- Status: 200 OK
- Response contains array of MCP connectors
- Each connector has: `id`, `name`, `actionTypeId: ".mcp"`
- Empty array if no MCP connectors configured

**Validation**:
- ✅ Returns only MCP connectors (filters out other action types)
- ✅ Space-scoped (only connectors in current space)
- ✅ Includes connector metadata

---

### 2. Tool Discovery from Connector

**Objective**: Verify tools can be discovered from an MCP connector

**Steps**:
```bash
# Replace {connector-id} with actual connector ID from step 1
curl -X GET "http://localhost:5601/internal/agent_builder/mcp/connectors/{connector-id}/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
- Status: 200 OK
- Response contains:
  - `connector`: Connector metadata
  - `tools`: Array of tool definitions
- Each tool has: `name`, `description`

**Validation**:
- ✅ Calls connector's `listTools` sub-action
- ✅ Handles connector errors gracefully
- ✅ Returns empty array if no tools available
- ✅ Validates connector is MCP type (400 if not)

---

### 3. Tool Registry Integration

**Objective**: Verify MCP tools appear in OneChat tool registry

**Steps**:
```bash
# List all tools (includes MCP tools)
curl -X GET "http://localhost:5601/api/agent_builder/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
- Status: 200 OK
- Response includes MCP tools with IDs like `mcp.{connectorId}.{toolName}`
- MCP tools marked with `source: "mcp"` or similar
- Tools have proper namespace protection

**Validation**:
- ✅ MCP tools visible alongside builtin and user tools
- ✅ Tool IDs follow namespace convention
- ✅ Provider metadata attached to tools
- ✅ Tools from multiple connectors all present

---

### 4. Tool Execution

**Objective**: Verify MCP tools can be executed

**Steps**:
```bash
# Get tool details to see schema
curl -X GET "http://localhost:5601/api/agent_builder/tools/mcp.{connector-id}.{tool-name}" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"

# Execute the tool
curl -X POST "http://localhost:5601/internal/agent_builder/tools/_execute" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)" \
  -d '{
    "tool_id": "mcp.{connector-id}.{tool-name}",
    "tool_params": {
      // Parameters based on tool schema
    }
  }'
```

**Expected Result**:
- Tool details: Full schema with parameters
- Tool execution: Returns results in OneChat format
  ```json
  {
    "results": [{
      "type": "other",
      "data": {
        "content": [...]
      }
    }]
  }
  ```

**Validation**:
- ✅ Tool schema properly converted from JSON Schema to Zod
- ✅ Parameters validated against schema
- ✅ Tool execution calls MCP connector via Actions
- ✅ Results transformed to OneChat format
- ✅ Errors handled gracefully

---

### 5. Agent Integration

**Objective**: Verify agents can use MCP tools

**Steps**:
```bash
# Create agent with MCP tool
curl -X POST "http://localhost:5601/api/agent_builder/agents" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)" \
  -d '{
    "id": "test_mcp_agent",
    "name": "Test MCP Agent",
    "description": "Agent for testing MCP integration",
    "configuration": {
      "instructions": "You are a test agent with access to MCP tools.",
      "tools": [{
        "tool_ids": ["mcp.{connector-id}.{tool-name}"]
      }]
    }
  }'

# Chat with agent
curl -X POST "http://localhost:5601/api/agent_builder/converse" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)" \
  -d '{
    "agent_id": "test_mcp_agent",
    "input": "Use the MCP tool to retrieve data"
  }'
```

**Expected Result**:
- Agent created successfully
- Agent can call MCP tools during conversation
- Tool results incorporated into agent response

**Validation**:
- ✅ Agent can reference MCP tools in configuration
- ✅ Tool IDs validated during agent creation
- ✅ LLM receives MCP tool schemas
- ✅ Agent can execute MCP tools
- ✅ Tool results presented to LLM

---

### 6. Space Isolation

**Objective**: Verify MCP connectors and tools respect space boundaries

**Steps**:
```bash
# In Space A: Create MCP connector
# (via Stack Management UI or API)

# In Space A: List connectors
curl -X GET "http://localhost:5601/s/space-a/internal/agent_builder/mcp/connectors" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"

# In Space B: List connectors
curl -X GET "http://localhost:5601/s/space-b/internal/agent_builder/mcp/connectors" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
- Space A: Sees connector
- Space B: Does NOT see connector (empty array)

**Validation**:
- ✅ Connectors are space-scoped (via Actions framework)
- ✅ Tools from connector only visible in correct space
- ✅ Tool execution fails if connector not in space

---

### 7. Error Handling

**Objective**: Verify graceful error handling

**Test Cases**:

**7a. Connector Not Found**:
```bash
curl -X GET "http://localhost:5601/internal/agent_builder/mcp/connectors/non-existent-id/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```
Expected: 404 Not Found

**7b. Wrong Connector Type**:
```bash
# Get ID of non-MCP connector (e.g., Slack connector)
curl -X GET "http://localhost:5601/internal/agent_builder/mcp/connectors/{slack-connector-id}/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```
Expected: 400 Bad Request ("not an MCP connector")

**7c. Connector Error**:
```bash
# With connector that returns error (e.g., invalid config)
curl -X GET "http://localhost:5601/internal/agent_builder/mcp/connectors/{broken-connector-id}/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```
Expected: 502 Bad Gateway (connector failed)

**7d. Tool Execution Failure**:
```bash
curl -X POST "http://localhost:5601/internal/agent_builder/tools/_execute" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)" \
  -d '{
    "tool_id": "mcp.{connector-id}.{tool-name}",
    "tool_params": {
      // Invalid parameters
    }
  }'
```
Expected: 400 Bad Request (validation error) or error result

**Validation**:
- ✅ Appropriate HTTP status codes
- ✅ Clear error messages
- ✅ No sensitive data in errors
- ✅ Errors logged for debugging

---

### 8. Provider Metadata

**Objective**: Verify provider metadata is attached to MCP tools

**Steps**:
```bash
# Get tool details
curl -X GET "http://localhost:5601/api/agent_builder/tools/mcp.{connector-id}.{tool-name}" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
Tool definition includes provider metadata:
```json
{
  "id": "mcp.github.get_issues",
  "provider": {
    "id": "mcp.github.get_issues",
    "name": "GitHub MCP",
    "namespace": "mcp.github"
  },
  // ... other fields
}
```

**Validation**:
- ✅ Provider metadata present
- ✅ Provider ID includes full tool ID
- ✅ Provider name matches connector name
- ✅ Namespace follows convention

---

### 9. Namespace Protection

**Objective**: Verify MCP namespace is protected

**Steps**:
```bash
# Try to create user tool with mcp. namespace
curl -X POST "http://localhost:5601/api/agent_builder/tools" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)" \
  -d '{
    "id": "mcp.my_tool",
    "type": "esql",
    "description": "Trying to use mcp namespace",
    "configuration": {
      "query": "FROM logs-* | LIMIT 1"
    }
  }'
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Namespace 'mcp' is protected"

**Validation**:
- ✅ Cannot create user tools in mcp. namespace
- ✅ Error message clear and actionable

---

### 10. Multiple Connectors

**Objective**: Verify multiple MCP connectors work together

**Steps**:
1. Configure 2+ MCP connectors in same space
2. List connectors - should see all
3. List tools from each connector
4. List all tools - should see tools from both
5. Create agent with tools from both connectors
6. Execute agent - should be able to use tools from both

**Validation**:
- ✅ No conflicts between connectors
- ✅ Tool namespaces keep tools separate
- ✅ Agent can use tools from multiple sources
- ✅ Provider metadata distinguishes tools

---

## Performance Tests

### 11. Tool Discovery Performance

**Objective**: Verify tool discovery is reasonably fast

**Steps**:
```bash
# Measure time to list all tools
time curl -X GET "http://localhost:5601/api/agent_builder/tools" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"
```

**Expected Result**:
- With 1 connector (10 tools): < 1 second
- With 5 connectors (50 tools): < 3 seconds

**Note**: First call may be slower due to cold start. Subsequent calls should be faster if caching implemented.

**Validation**:
- ✅ Reasonable response times
- ✅ No significant degradation with multiple connectors
- ✅ Errors don't cause excessive delays

---

### 12. Concurrent Tool Execution

**Objective**: Verify multiple tool executions don't interfere

**Steps**:
Run multiple tool executions in parallel (use different terminals or scripts).

**Validation**:
- ✅ No race conditions
- ✅ Each request properly isolated
- ✅ Results returned to correct requester

---

## Cleanup

After testing:
```bash
# Delete test agent
curl -X DELETE "http://localhost:5601/api/agent_builder/agents/test_mcp_agent" \
  -H "kbn-xsrf: true" \
  -H "Authorization: Basic $(echo -n 'elastic:changeme' | base64)"

# MCP connectors can be deleted via Stack Management UI
```

---

## Test Result Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Connector Discovery | ⬜ | |
| 2. Tool Discovery | ⬜ | |
| 3. Tool Registry Integration | ⬜ | |
| 4. Tool Execution | ⬜ | |
| 5. Agent Integration | ⬜ | |
| 6. Space Isolation | ⬜ | |
| 7. Error Handling | ⬜ | |
| 8. Provider Metadata | ⬜ | |
| 9. Namespace Protection | ⬜ | |
| 10. Multiple Connectors | ⬜ | |
| 11. Performance | ⬜ | |
| 12. Concurrent Execution | ⬜ | |

---

## Known Limitations

1. **No Caching**: Tool discovery happens on every request (Phase 1 MVP)
   - Future: Implement 5-minute cache at provider level
   - Future: Invalidate cache on connector update events

2. **No Real-time Updates**: If connector tools change, requires page refresh
   - Future: WebSocket or polling for updates

3. **Basic Error Messages**: Some MCP errors may not be user-friendly
   - Future: Error message mapping/translation

---

## Success Criteria

All tests must pass with:
- ✅ No errors in Kibana logs (except expected test errors)
- ✅ All API responses have correct status codes
- ✅ Space isolation working correctly
- ✅ Authorization checks enforced
- ✅ Provider metadata present on all tools
- ✅ Namespace protection working
- ✅ Tools discoverable and executable
- ✅ Agents can use MCP tools successfully

---

**Test Date**: _______________
**Tester**: _______________
**Kibana Version**: _______________
**MCP Connector Version**: _______________
**Result**: PASS / FAIL

**Notes**:
