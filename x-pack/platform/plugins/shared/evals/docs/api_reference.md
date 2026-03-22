# AESOP API Reference

Complete API reference for the Autonomous Skill Discovery system.

## Table of Contents

1. [Authentication](#authentication)
2. [Core Exploration APIs](#core-exploration-apis)
3. [Skill Management APIs](#skill-management-apis)
4. [Monitoring & Administration APIs](#monitoring--administration-apis)
5. [Error Codes](#error-codes)
6. [Rate Limits](#rate-limits)

---

## Authentication

All AESOP APIs require Kibana authentication.

**Methods:**
- Basic Auth: `Authorization: Basic {base64(username:password)}`
- API Key: `Authorization: ApiKey {api_key}`
- Session Cookie: Automatic when using Kibana UI

**Required Privileges:**
- `evals` feature privilege (minimum: read)
- `evals:write` for modification operations

**Example:**
```bash
curl -u elastic:changeme \
  -H "kbn-xsrf: true" \
  "http://localhost:5601/internal/aesop/..."
```

---

## Core Exploration APIs

### POST /internal/aesop/exploration/run

Triggers a self-exploration workflow to discover skills from your data.

**Request Body:**

```typescript
{
  agent_role?: string;              // Default: "SOC analyst"
  scoped_indices?: string[];        // Default: [".alerts-security.alerts-*", ...]
  exploration_depth?: number;       // Default: 100, Range: 10-1000
  min_pattern_frequency?: number;   // Default: 10, Range: 1-100
  exploration_mode?: "full" | "incremental";  // Default: "incremental" after first run
}
```

**Response:**

```typescript
{
  success: boolean;
  execution_id: string;             // UUID for tracking progress
  workflow_name: string;            // "aesop.self_exploration"
  status: "running" | "completed" | "failed";
  started_at: string;               // ISO 8601 timestamp
  message?: string;
}
```

**Example:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "agent_role": "Threat hunter",
    "scoped_indices": [".alerts-security.alerts-*", "logs-endpoint.*"],
    "exploration_depth": 150,
    "min_pattern_frequency": 10
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "workflow_name": "aesop.self_exploration",
  "status": "running",
  "started_at": "2024-01-15T14:30:00.000Z",
  "message": "Self-exploration started. Execution ID: exec-123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Workflow execution failed
- `503 Service Unavailable`: Workflows plugin not available

**Duration:** Full exploration: 1-3 hours. Incremental: 15-30 minutes.

**Rate Limit:** 1 request per hour per user.

---

### GET /internal/aesop/exploration/{executionId}/progress

Get real-time progress updates for a running exploration.

**Path Parameters:**

- `executionId` (required): Execution ID from run response

**Response:**

```typescript
{
  execution_id: string;
  workflow_name: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  updated_at: string;
  completed_at?: string;
  duration_ms?: number;
  current_phase?: string;           // e.g., "schema_discovery", "pattern_mining"
  progress_percentage?: number;     // 0-100
  metrics?: {
    indices_discovered?: number;
    patterns_found?: number;
    skills_proposed?: number;
    total_tokens?: number;
  };
  error?: string;
}
```

**Example:**

```bash
curl -X GET "http://localhost:5601/internal/aesop/exploration/exec-123.../progress" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Success Response (200):**

```json
{
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "workflow_name": "aesop.self_exploration",
  "status": "running",
  "started_at": "2024-01-15T14:30:00.000Z",
  "updated_at": "2024-01-15T15:15:00.000Z",
  "current_phase": "pattern_mining",
  "progress_percentage": 65,
  "metrics": {
    "indices_discovered": 12,
    "patterns_found": 47,
    "skills_proposed": 0,
    "total_tokens": 15420
  }
}
```

**Polling Recommendation:** Poll every 5-10 seconds while status is "running".

**Error Responses:**

- `404 Not Found`: Execution ID not found
- `500 Internal Server Error`: Failed to retrieve progress

---

### GET /internal/aesop/exploration/{executionId}/detail

Get detailed execution information including all workflow steps.

**Path Parameters:**

- `executionId` (required): Execution ID

**Response:**

```typescript
{
  execution_id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  parameters: {
    agent_role: string;
    scoped_indices: string[];
    exploration_depth: number;
    min_pattern_frequency: number;
  };
  steps: Array<{
    step_name: string;
    status: "pending" | "running" | "completed" | "failed";
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    error?: string;
  }>;
  metrics: {
    indices_discovered: number;
    patterns_found: number;
    skills_proposed: number;
    total_tokens: number;
    cost_usd?: number;
  };
}
```

**Example:**

```bash
curl -X GET "http://localhost:5601/internal/aesop/exploration/exec-123.../detail" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Success Response (200):**

```json
{
  "execution_id": "exec-123e4567-e89b-12d3-a456-426614174000",
  "workflow_name": "aesop.self_exploration",
  "status": "completed",
  "started_at": "2024-01-15T14:30:00.000Z",
  "completed_at": "2024-01-15T16:15:00.000Z",
  "duration_ms": 6300000,
  "parameters": {
    "agent_role": "Threat hunter",
    "scoped_indices": [".alerts-security.alerts-*"],
    "exploration_depth": 150,
    "min_pattern_frequency": 10
  },
  "steps": [
    {
      "step_name": "schema_discovery",
      "status": "completed",
      "started_at": "2024-01-15T14:30:05.000Z",
      "completed_at": "2024-01-15T14:55:00.000Z",
      "duration_ms": 1495000
    },
    {
      "step_name": "pattern_mining",
      "status": "completed",
      "started_at": "2024-01-15T14:55:05.000Z",
      "completed_at": "2024-01-15T15:45:00.000Z",
      "duration_ms": 2995000
    }
  ],
  "metrics": {
    "indices_discovered": 12,
    "patterns_found": 47,
    "skills_proposed": 5,
    "total_tokens": 48250,
    "cost_usd": 24.13
  }
}
```

---

## Skill Management APIs

### GET /internal/aesop/skills/proposed

List proposed skills with optional filtering.

**Query Parameters:**

```typescript
{
  status?: "pending" | "approved" | "rejected" | "all";  // Default: "pending"
  limit?: number;         // Default: 20, Max: 100
  offset?: number;        // Default: 0
  sort_by?: "created_at" | "quality_score" | "name";  // Default: "created_at"
  sort_order?: "asc" | "desc";  // Default: "desc"
  execution_id?: string;  // Filter by specific exploration
  min_quality_score?: number;  // Filter by minimum quality score (0.0-1.0)
}
```

**Response:**

```typescript
{
  total: number;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    skill_type: string;
    skill_content: string;
    created_at: string;
    validation: {
      quality_score: number;
      passed: boolean;
      errors?: string[];
    };
    review?: {
      status: "pending" | "approved" | "rejected";
      reviewed_at?: string;
      reviewed_by?: string;
      feedback?: string;
    };
    metadata: {
      execution_id: string;
      cycle_number: number;
      agent_role: string;
    };
  }>;
}
```

**Example:**

```bash
# Get pending skills
curl -X GET "http://localhost:5601/internal/aesop/skills/proposed?status=pending&limit=10" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme

# Get high-quality approved skills
curl -X GET "http://localhost:5601/internal/aesop/skills/proposed?status=approved&min_quality_score=0.9" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Success Response (200):**

```json
{
  "total": 5,
  "skills": [
    {
      "skill_id": "skill-789abc",
      "skill_name": "Alert Triage for Lateral Movement",
      "skill_type": "security.alert.triage",
      "skill_content": "# Alert Triage for Lateral Movement\n\nTriages security alerts...",
      "created_at": "2024-01-15T16:20:00.000Z",
      "validation": {
        "quality_score": 0.92,
        "passed": true
      },
      "review": {
        "status": "pending"
      },
      "metadata": {
        "execution_id": "exec-123e4567",
        "cycle_number": 3,
        "agent_role": "Threat hunter"
      }
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Failed to retrieve skills

---

### POST /internal/aesop/skills/{skillId}/validate

Run validation workflow on a proposed skill.

**Path Parameters:**

- `skillId` (required): Skill ID to validate

**Request Body:**

```typescript
{
  validation_types?: string[];  // Default: ["syntax", "security", "quality"]
}
```

**Response:**

```typescript
{
  success: boolean;
  skill_id: string;
  validation_id: string;
  started_at: string;
  message: string;
}
```

**Example:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/skills/skill-789abc/validate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "validation_types": ["syntax", "security", "quality"]
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "skill_id": "skill-789abc",
  "validation_id": "val-456def",
  "started_at": "2024-01-15T17:00:00.000Z",
  "message": "Validation started for skill: Alert Triage for Lateral Movement"
}
```

**Duration:** 20-30 minutes

**Rate Limit:** 10 requests per hour per user

---

### POST /internal/aesop/skills/{skillId}/approve

Approve a skill and deploy it to Agent Builder.

**Path Parameters:**

- `skillId` (required): Skill ID to approve

**Request Body:**

```typescript
{
  comments?: string;  // Optional approval comments
}
```

**Response:**

```typescript
{
  success: boolean;
  skill_id: string;
  agent_builder_skill_id: string;
  deployed_at: string;
  message: string;
}
```

**Example:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/skills/skill-789abc/approve" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "comments": "Excellent skill for lateral movement detection"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "skill_id": "skill-789abc",
  "agent_builder_skill_id": "aesop.generated.lateral_movement_triage",
  "deployed_at": "2024-01-15T17:05:00.000Z",
  "message": "Skill approved and deployed to Agent Builder"
}
```

**Error Responses:**

- `400 Bad Request`: Skill already reviewed or invalid state
- `404 Not Found`: Skill ID not found
- `500 Internal Server Error`: Failed to deploy to Agent Builder

**Rate Limit:** 20 requests per hour per user

---

### POST /internal/aesop/skills/{skillId}/reject

Reject a skill with feedback for learning.

**Path Parameters:**

- `skillId` (required): Skill ID to reject

**Request Body:**

```typescript
{
  reason: "poor_quality" | "not_useful" | "overlaps_existing" | "security_concern" | "other";
  feedback: string;  // Required: Detailed explanation
}
```

**Response:**

```typescript
{
  success: boolean;
  skill_id: string;
  rejected_at: string;
  message: string;
}
```

**Example:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/skills/skill-789abc/reject" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "reason": "overlaps_existing",
    "feedback": "This skill duplicates functionality of aesop.generated.alert_triage_v1. Focus on novel patterns."
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "skill_id": "skill-789abc",
  "rejected_at": "2024-01-15T17:10:00.000Z",
  "message": "Skill rejected. Feedback will be incorporated in next exploration cycle."
}
```

**Error Responses:**

- `400 Bad Request`: Missing or invalid feedback
- `404 Not Found`: Skill ID not found
- `500 Internal Server Error`: Failed to store feedback

**Feedback Quality:** The more detailed and specific your feedback, the better the system learns.

**Rate Limit:** 20 requests per hour per user

---

## Monitoring & Administration APIs

### POST /internal/aesop/monitoring/dashboard/deploy

Deploy the AESOP Performance Monitoring dashboard.

**Request Body:**

```typescript
{
  overwrite?: boolean;  // Default: true
}
```

**Response:**

```typescript
{
  success: boolean;
  dashboard_id: string;
  dashboard_url: string;
  panels_created: number;
}
```

**Example:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/monitoring/dashboard/deploy" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "overwrite": true
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "dashboard_id": "aesop-performance-monitoring",
  "dashboard_url": "/app/dashboards#/view/aesop-performance-monitoring",
  "panels_created": 8
}
```

**Dashboard Panels:**
1. Skill Invocations (Last 7 Days)
2. Success Rate by Skill Type
3. Approval Rate by Exploration Cycle
4. Average Validation Scores
5. Exploration Duration Trend
6. Token Usage by Agent
7. Discovery Coverage
8. Cost per Skill Generated

**Error Responses:**

- `500 Internal Server Error`: Failed to create dashboard

---

### POST /internal/aesop/monitoring/alerts/deploy

Deploy alerting rules for AESOP monitoring.

**Request Body:**

```typescript
{
  rule_ids?: string[];     // Optional: Deploy specific rules only
  overwrite?: boolean;     // Default: true
  dry_run?: boolean;       // Default: false (preview without creating)
}
```

**Response:**

```typescript
{
  success: boolean;
  dry_run: boolean;
  rules_created: number;
  rules_updated: number;
  rules_skipped: number;
  rule_ids: string[];
  errors?: Array<{
    rule_id: string;
    error: string;
  }>;
  preview?: Array<{      // Only if dry_run: true
    id: string;
    name: string;
    description: string;
    rule_type: string;
    tags?: string[];
  }>;
}
```

**Example:**

```bash
# Deploy all rules
curl -X POST "http://localhost:5601/internal/aesop/monitoring/alerts/deploy" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "overwrite": true
  }'

# Preview rules without deploying
curl -X POST "http://localhost:5601/internal/aesop/monitoring/alerts/deploy" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "dry_run": true
  }'

# Deploy specific rules
curl -X POST "http://localhost:5601/internal/aesop/monitoring/alerts/deploy" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "rule_ids": ["aesop.exploration.failure_rate_high", "aesop.skills.approval_rate_low"]
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "dry_run": false,
  "rules_created": 5,
  "rules_updated": 3,
  "rules_skipped": 0,
  "rule_ids": [
    "aesop.exploration.failure_rate_high",
    "aesop.skills.approval_rate_low",
    "aesop.exploration.duration_excessive",
    "aesop.cost.token_usage_high",
    "aesop.skills.validation_failure_rate_high",
    "aesop.exploration.no_recent_activity",
    "aesop.learning.approval_rate_stagnant",
    "aesop.discovery.coverage_low"
  ]
}
```

**Alerting Rules Deployed:**

1. **CRITICAL:** High Exploration Failure Rate (>10%)
2. **HIGH:** Low Skill Approval Rate (<30%)
3. **HIGH:** Exploration Duration Excessive (>4 hours)
4. **MEDIUM:** High Token Usage (>50K per exploration)
5. **MEDIUM:** High Skill Validation Failure Rate (>15%)
6. **LOW:** No Recent Exploration Activity (>7 days)
7. **MEDIUM:** Approval Rate Not Improving (stagnant)
8. **MEDIUM:** Low Discovery Coverage (<50%)

**Error Responses:**

- `400 Bad Request`: Invalid rule IDs
- `500 Internal Server Error`: Failed to deploy rules

---

### GET /internal/aesop/health

Get overall system health status.

**Response:**

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  components: {
    elasticsearch: "available" | "unavailable";
    workflows: "available" | "unavailable";
    agent_builder: "available" | "unavailable";
    edot_collector: "available" | "unavailable";
  };
  last_exploration?: string;  // ISO timestamp
  pending_skills: number;
  active_explorations: number;
  issues?: string[];
}
```

**Example:**

```bash
curl -X GET "http://localhost:5601/internal/aesop/health" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Success Response (200):**

```json
{
  "status": "healthy",
  "components": {
    "elasticsearch": "available",
    "workflows": "available",
    "agent_builder": "available",
    "edot_collector": "available"
  },
  "last_exploration": "2024-01-15T16:15:00.000Z",
  "pending_skills": 3,
  "active_explorations": 0
}
```

**Degraded Response (200):**

```json
{
  "status": "degraded",
  "components": {
    "elasticsearch": "available",
    "workflows": "available",
    "agent_builder": "available",
    "edot_collector": "unavailable"
  },
  "last_exploration": "2024-01-15T16:15:00.000Z",
  "pending_skills": 3,
  "active_explorations": 0,
  "issues": [
    "EDOT collector is not sending traces. Token usage metrics will be unavailable."
  ]
}
```

---

## Error Codes

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient privileges
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Required service unavailable

### Error Response Format

```typescript
{
  statusCode: number;
  error: string;
  message: string;
}
```

**Example Error Response:**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error: exploration_depth must be between 10 and 1000"
}
```

### Common Error Messages

**Exploration APIs:**

- `"Workflows Management plugin not available"` → Enable `xpack.workflows.enabled: true`
- `"No indices match pattern"` → Verify scoped_indices exist
- `"Exploration already running"` → Wait for current exploration to complete
- `"Invalid exploration_depth"` → Must be 10-1000

**Skill APIs:**

- `"Skill not found"` → Invalid skill_id
- `"Skill already reviewed"` → Cannot approve/reject twice
- `"Validation in progress"` → Wait for validation to complete
- `"Agent Builder not available"` → Enable `xpack.agentBuilder.enabled: true`

**Monitoring APIs:**

- `"Dashboard already exists"` → Use `overwrite: true` to replace
- `"Insufficient permissions"` → Requires admin privileges

---

## Rate Limits

### Default Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Run Exploration | 1 request | 1 hour per user |
| Validate Skill | 10 requests | 1 hour per user |
| Approve/Reject Skill | 20 requests | 1 hour per user |
| List Skills | 100 requests | 1 minute per user |
| Get Progress | 60 requests | 1 minute per user |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 minutes.",
  "retry_after": 2700
}
```

### Configuring Rate Limits

Adjust in `kibana.yml`:

```yaml
xpack.evals.aesop.rate_limits:
  explorations_per_hour: 1
  validations_per_hour: 10
  approvals_per_hour: 20
```

---

## Best Practices

### Polling for Progress

**Recommended Pattern:**

```javascript
async function pollExplorationProgress(executionId) {
  let status = 'running';

  while (status === 'running') {
    const response = await fetch(
      `/internal/aesop/exploration/${executionId}/progress`,
      { headers: { 'kbn-xsrf': 'true' } }
    );

    const data = await response.json();
    status = data.status;

    if (status === 'running') {
      console.log(`Progress: ${data.progress_percentage}% - ${data.current_phase}`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    }
  }

  return status === 'completed';
}
```

### Handling Errors

**Recommended Pattern:**

```javascript
async function approveSkill(skillId) {
  try {
    const response = await fetch(
      `/internal/aesop/skills/${skillId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true'
        },
        body: JSON.stringify({
          comments: 'Approved for production use'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to approve skill:', error.message);
    // Handle specific errors
    if (error.message.includes('already reviewed')) {
      console.log('Skill was already reviewed');
    }
    throw error;
  }
}
```

### Pagination

**Recommended Pattern:**

```javascript
async function getAllProposedSkills() {
  const allSkills = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `/internal/aesop/skills/proposed?limit=${limit}&offset=${offset}`,
      { headers: { 'kbn-xsrf': 'true' } }
    );

    const data = await response.json();
    allSkills.push(...data.skills);

    offset += limit;
    hasMore = data.skills.length === limit;
  }

  return allSkills;
}
```

---

## Changelog

### Version 1.0 (Current)

Initial release with:
- Core exploration APIs
- Skill management (list, validate, approve, reject)
- Monitoring and administration APIs
- Real-time progress tracking
- Alerting rules deployment
- Dashboard deployment

### Upcoming Features

- **v1.1:** Skill similarity detection API
- **v1.2:** Batch skill approval/rejection
- **v1.3:** Exploration scheduling API
- **v1.4:** Custom agent configuration
- **v1.5:** Multi-space support
