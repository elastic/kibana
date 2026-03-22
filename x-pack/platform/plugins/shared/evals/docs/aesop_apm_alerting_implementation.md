# AESOP APM Instrumentation & Alerting Implementation

**Implementation Date**: 2026-03-22
**Branch**: `spike/aesop-spike`
**Plugin**: `x-pack/platform/plugins/shared/evals`

---

## Overview

This document describes the APM instrumentation and alerting system implementation for the AESOP (Autonomous Exploration for Skill Opportunity Probing) autonomous skill discovery system.

**Time Allocation**: 8 hours
- APM Instrumentation: 4 hours
- Alerting Configuration: 4 hours

---

## Part 1: APM Instrumentation (4 hours)

### 1.1 APM Instrumentation Service

**File**: `server/lib/aesop/monitoring/apm_instrumentation.ts`

**Purpose**: Provides custom APM instrumentation for autonomous skill discovery workflows.

**Key Features**:

#### Workflow Step Instrumentation
```typescript
await apmService.instrumentWorkflowStep(
  'schema_discovery',
  { indices: scopedIndices },
  async () => {
    // Execute schema discovery step
  }
);
```

**Tracks**:
- Execution duration (milliseconds)
- Success/failure outcome
- Custom metadata about the step
- Span ID for correlation

#### Agent Invocation Tracking
```typescript
await apmService.instrumentAgentCall(
  'aesop.schema_categorizer',
  async () => {
    // Invoke agent
  }
);
```

**Tracks**:
- Agent execution duration
- Token usage (prompt, completion, cached)
- Cache hit rate
- Model used
- Error details on failure

#### Skill Validation Performance
```typescript
await apmService.instrumentSkillValidation(
  skillId,
  'security',
  async () => {
    // Validate skill
  }
);
```

**Tracks**:
- Validation type (syntax, security, quality)
- Duration
- Outcome (pass/fail)

### 1.2 Custom Metrics Index

**Index**: `aesop_metrics`

**Mappings**:
```json
{
  "@timestamp": "date",
  "span_id": "keyword",
  "name": "keyword",
  "type": "keyword",
  "duration_ms": "long",
  "outcome": "keyword",
  "error": "text",
  "metadata": {
    "agent_id": "keyword",
    "prompt_tokens": "long",
    "completion_tokens": "long",
    "total_tokens": "long",
    "cached_tokens": "long",
    "cache_hit_rate": "double"
  }
}
```

### 1.3 Integration with Workflow Execution

**File**: `server/routes/aesop/run_exploration.ts`

**Changes**:
- Added APM instrumentation import
- Initialized APM service in route handler
- Wrapped workflow execution with `instrumentWorkflowStep`
- Ensures metrics index exists on startup

**Example Integration**:
```typescript
const apmService = new APMInstrumentationService(esClient, logger);
await apmService.ensureMetricsIndex();

const executionId = await apmService.instrumentWorkflowStep(
  'workflow_execution',
  {
    workflow_name: 'aesop.self_exploration',
    agent_role: sanitizedAgentRole,
    scoped_indices: sanitizedIndices,
  },
  async () => {
    return await workflowApi.runWorkflow(...);
  }
);
```

### 1.4 Token Usage Extraction

**Automatic Detection**:
- Extracts token usage from LLM response objects
- Handles multiple response formats (OpenAI, Anthropic, etc.)
- Calculates total tokens if not provided
- Computes cache hit rate when cached tokens available

**Example**:
```typescript
{
  usage: {
    prompt_tokens: 1000,
    completion_tokens: 500,
    total_tokens: 1500,
    cached_tokens: 800
  }
}
// → cache_hit_rate = 80% (800/1000 * 100)
```

---

## Part 2: Alerting Configuration (4 hours)

### 2.1 Alerting Rules Definition

**File**: `server/lib/aesop/monitoring/alerting_rules.ts`

**Total Rules**: 7 (3 CRITICAL, 3 WARNING, 1 INFO)

#### CRITICAL Alerts

| Alert ID | Threshold | Description |
|----------|-----------|-------------|
| `aesop-exploration-failure-rate` | >3 failures in 24h | Systematic workflow execution issues |
| `aesop-workflow-timeout` | Running >4 hours | Hung workflow or resource starvation |
| `aesop-token-cost-overrun` | >$50 in 1 hour | LLM cost budget exceeded |

#### WARNING Alerts

| Alert ID | Threshold | Description |
|----------|-----------|-------------|
| `aesop-approval-rate-regression` | <40% approval rate | Quality degradation in generated skills |
| `aesop-security-violation-rate` | >20% security rejections | Security issues in skill generation |
| `aesop-data-quality-issues` | Avg quality score <0.7 | Schema discovery finding poor patterns |

#### INFO Alerts

| Alert ID | Threshold | Description |
|----------|-----------|-------------|
| `aesop-low-cache-hit-rate` | <60% cache hits | Inefficient caching or changing prompts |

### 2.2 Alert Structure

**Each rule includes**:
```typescript
{
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  description: string;           // Detailed explanation
  rule_type: 'threshold' | 'anomaly';
  query: {
    esql?: string;               // ES|QL query for metrics
    kuery?: string;              // KQL alternative
  };
  threshold: {
    value: number;               // Alert threshold
    comparator: 'greater_than' | 'less_than' | 'equals';
  };
  interval?: string;             // Check frequency
  tags?: string[];               // For filtering
  actions?: AlertingAction[];    // Slack notifications
}
```

### 2.3 Deployment Route

**File**: `server/routes/aesop/deploy_alerting_rules.ts`

**Endpoint**: `POST /internal/aesop/monitoring/alerts/deploy`

**Features**:
- Deploy all rules or specific subset
- Dry-run mode for preview
- Overwrite control for existing rules
- Detailed deployment results
- Index template creation

**Request Schema**:
```typescript
{
  rule_ids?: string[];      // Optional: specific rules to deploy
  overwrite?: boolean;      // Default: true
  dry_run?: boolean;        // Default: false
}
```

**Response Schema**:
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
  preview?: Array<{          // Only in dry-run mode
    id: string;
    name: string;
    description: string;
    rule_type: string;
    tags?: string[];
  }>;
}
```

**Storage**:
- Rules stored in `.aesop-alert-rules` index
- Includes deployment metadata (`deployed_at`, `deployed_by`)
- Index template auto-created if not exists

### 2.4 Alert Actions (Slack Notifications)

**All alerts sent to**: `#security-ai-alerts`

**Message Format**:
```
🚨 CRITICAL: AESOP Autonomous Skill Discovery

**High Exploration Failure Rate Detected**
- Failures in last 24h: {{context.failures}}
- Threshold: 3 explorations

**Impact:**
- Skill discovery pipeline blocked
- No new skills being generated

**Action Required:**
1. Check `.aesop-workflow-executions` index
2. Review Elasticsearch cluster health
3. Verify workflow permissions
4. Check runbook: docs/aesop_production_runbook.md

**Dashboard:** [AESOP Performance Monitoring](#/dashboard/...)
```

---

## Part 3: Production Runbook

**File**: `docs/aesop_production_runbook.md`

**Sections**:

### 3.1 System Overview
- Architecture diagram
- Key components
- Key metrics and targets

### 3.2 Monitoring & Alerting
- Dashboard locations
- Alert rules reference
- Alert severity definitions

### 3.3 Common Failure Modes
1. **Workflow Execution Failures**
   - Elasticsearch cluster issues
   - Permission/security errors
   - Agent API timeouts

2. **Workflow Timeout (Hung Execution)**
   - How to identify
   - How to cancel
   - Prevention strategies

3. **Low Approval Rate (<40%)**
   - Investigation queries
   - Common causes
   - Fix procedures

4. **Token Cost Overrun (>$50/hour)**
   - Immediate actions (PAUSE workflow)
   - Investigation steps
   - Prevention measures

5. **Security Violation Rate (>20%)**
   - Violation analysis
   - Validation checks
   - Remediation

### 3.4 Incident Response Procedures
- Severity definitions (P1-P4)
- Response time targets
- Step-by-step procedures

### 3.5 Operational Tasks
- Daily: Dashboard review, alert acknowledgment
- Weekly: Skill reviews, trend analysis, data cleanup
- Monthly: Performance review, threshold tuning, prompt review

### 3.6 Troubleshooting Guide
- Restart failed exploration
- Rollback deployed skill
- Debug low approval rates
- Investigate high token costs

### 3.7 Escalation Procedures
- When to escalate
- Escalation contacts by team
- Information to provide

### 3.8 Useful Queries
- Latest exploration status
- Pending skill reviews
- Approval rate calculation
- Token usage analysis

---

## Testing

### 4.1 APM Instrumentation Tests

**File**: `server/lib/aesop/monitoring/apm_instrumentation.test.ts`

**Coverage**:
- ✅ Successful workflow step execution
- ✅ Failed workflow step execution
- ✅ Metrics recording failures (graceful degradation)
- ✅ Agent invocation with token usage
- ✅ Agent invocation without token usage
- ✅ Failed agent invocation
- ✅ Skill validation (success and failure)
- ✅ Metrics index creation
- ✅ Token usage extraction
- ✅ Cache hit rate calculation

### 4.2 Alerting Deployment Tests

**File**: `server/routes/aesop/deploy_alerting_rules.test.ts`

**Coverage**:
- ✅ Deploy all rules
- ✅ Deploy specific rules
- ✅ Dry-run mode
- ✅ Skip existing rules (overwrite=false)
- ✅ Update existing rules (overwrite=true)
- ✅ Invalid rule IDs
- ✅ Partial failures
- ✅ Index template creation
- ✅ Deployment metadata
- ✅ Elasticsearch error handling

---

## Files Created/Modified

### Created Files

**APM Instrumentation**:
- `server/lib/aesop/monitoring/apm_instrumentation.ts` (11 KB)
- `server/lib/aesop/monitoring/apm_instrumentation.test.ts` (12 KB)

**Alerting**:
- `server/lib/aesop/monitoring/alerting_rules.ts` (5.7 KB)
- `server/routes/aesop/deploy_alerting_rules.ts` (8.8 KB)
- `server/routes/aesop/deploy_alerting_rules.test.ts` (11 KB)

**Documentation**:
- `docs/aesop_production_runbook.md` (17 KB)
- `docs/aesop_apm_alerting_implementation.md` (this file)

### Modified Files

**Integration**:
- `server/routes/aesop/run_exploration.ts`
  - Added APM service initialization
  - Wrapped workflow execution with instrumentation
  - Ensured metrics index creation

- `server/routes/aesop/register_aesop_routes.ts`
  - Registered `deploy_alerting_rules` route
  - Updated route documentation

- `server/lib/aesop/monitoring/index.ts`
  - Exported APM instrumentation service
  - Exported alerting rules and utilities

---

## Usage

### Deploy Alerting Rules

```bash
# Deploy all rules
POST /internal/aesop/monitoring/alerts/deploy
{}

# Dry-run preview
POST /internal/aesop/monitoring/alerts/deploy
{
  "dry_run": true
}

# Deploy specific rules
POST /internal/aesop/monitoring/alerts/deploy
{
  "rule_ids": [
    "aesop-exploration-failure-rate",
    "aesop-workflow-timeout"
  ]
}

# Skip existing rules
POST /internal/aesop/monitoring/alerts/deploy
{
  "overwrite": false
}
```

### Query Metrics

```bash
# Get workflow execution metrics
GET aesop_metrics/_search
{
  "query": {
    "term": { "type": "workflow_execution" }
  }
}

# Get agent token usage
GET aesop_metrics/_search
{
  "query": {
    "term": { "type": "agent_execution" }
  },
  "aggs": {
    "by_agent": {
      "terms": { "field": "metadata.agent_id" },
      "aggs": {
        "avg_tokens": {
          "avg": { "field": "metadata.total_tokens" }
        }
      }
    }
  }
}

# Calculate cache hit rate
GET aesop_metrics/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "type": "agent_execution" } },
        { "exists": { "field": "metadata.cache_hit_rate" } }
      ]
    }
  },
  "aggs": {
    "avg_cache_hit_rate": {
      "avg": { "field": "metadata.cache_hit_rate" }
    }
  }
}
```

---

## Key Metrics Dashboard

**Index Patterns**:
- `aesop_metrics` - Custom APM metrics
- `.aesop-workflow-executions` - Workflow execution history
- `.aesop-proposed-skills` - Generated skill proposals
- `.aesop-alert-rules` - Deployed alerting rules

**Visualizations**:
1. Workflow step duration trends
2. Agent invocation frequency
3. Token usage by agent (with cache hit rate)
4. Exploration success rate
5. Quality score distribution
6. Security violation trends
7. Cost efficiency metrics

---

## Production Checklist

Before deploying to production:

- [ ] Deploy alerting rules: `POST /internal/aesop/monitoring/alerts/deploy`
- [ ] Verify Slack webhook configured for `#security-ai-alerts`
- [ ] Test alert notifications (trigger test alert)
- [ ] Create AESOP Performance Monitoring dashboard
- [ ] Configure index lifecycle policies for `aesop_metrics`
- [ ] Set up log rotation for `.aesop-workflow-executions`
- [ ] Review and adjust alert thresholds based on baseline
- [ ] Document on-call procedures in runbook
- [ ] Train team on incident response procedures
- [ ] Set up weekly review cadence for approval rates

---

## Next Steps

1. **Enhanced Metrics Collection**
   - Add workflow state transition tracking
   - Track schema discovery pattern quality
   - Monitor feedback loop effectiveness

2. **Advanced Alerting**
   - Anomaly detection for token usage spikes
   - Predictive alerting for approval rate trends
   - Multi-condition composite rules

3. **Dashboard Enhancements**
   - Real-time metrics (WebSocket updates)
   - Cost projection dashboard
   - Skill quality trend analysis
   - Competitive benchmarking vs manual skills

4. **Integration**
   - Integrate with Elastic APM (OTEL traces)
   - Add structured logging for audit trail
   - Connect to incident management system

---

## References

- [AESOP Architecture](./aesop_architecture.md)
- [AESOP Production Runbook](./aesop_production_runbook.md)
- [Kibana Alerting Framework](https://www.elastic.co/guide/en/kibana/current/alerting-getting-started.html)
- [OpenTelemetry Instrumentation](https://opentelemetry.io/docs/instrumentation/)

---

**Maintained By**: Security AI Team
**Last Updated**: 2026-03-22
**Version**: 1.0.0
