# Autonomous Skill Discovery - Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Operational Procedures](#operational-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring](#monitoring)
7. [Security](#security)
8. [Scaling](#scaling)
9. [Backup & Recovery](#backup--recovery)
10. [Performance Benchmarks](#performance-benchmarks)

---

## Prerequisites

### Infrastructure Requirements

**Elasticsearch Cluster:**
- Version: 9.x or higher
- Minimum heap size: 4GB
- Recommended: 8GB for production workloads
- Storage: 50GB minimum for indices and traces

**Kibana Instance:**
- Version: 9.x or higher (must match Elasticsearch)
- Minimum heap size: 2GB
- Recommended: 4GB for production
- Plugins required:
  - Evals plugin (bundled)
  - Agent Builder plugin (optional but recommended)
  - Workflows plugin (optional but recommended)

**EDOT (Elastic Distribution of OpenTelemetry) Collector:**
- Version: Latest stable
- Required for observability traces
- Configuration: HTTP endpoint on port 4318

### Access Requirements

**API Keys:**
- Claude API key (for Agent Builder agents)
- Stored in environment variable or Kibana config

**Permissions:**
- Elasticsearch superuser access for initial setup
- Kibana admin access for dashboard deployment
- Space-level access for runtime operations

---

## Installation Steps

### Step 1: Enable Evals Plugin

Add to `kibana.yml`:

```yaml
# Enable Evals plugin
xpack.evals.enabled: true

# Optional: Configure AESOP-specific settings
xpack.evals.aesop:
  enabled: true
  exploration:
    max_depth: 100
    default_indices:
      - '.alerts-security.alerts-*'
      - '.siem-signals-*'
      - 'logs-endpoint.*'
  rate_limits:
    explorations_per_hour: 1
    validations_per_hour: 10
    approvals_per_hour: 20
```

Restart Kibana:

```bash
# Systemd
sudo systemctl restart kibana

# Docker
docker restart kibana
```

### Step 2: Deploy EDOT Collector

**Option A: Docker**

Create `edot-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  elasticsearch:
    endpoints:
      - http://elasticsearch:9200
    traces_index: traces-apm.otel-*
    logs_index: logs-apm.otel-*
    auth:
      authenticator: basicauth

  logging:
    loglevel: info

extensions:
  basicauth:
    client_auth:
      username: elastic
      password: ${ELASTIC_PASSWORD}

service:
  extensions: [basicauth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch, logging]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [elasticsearch]
```

Start collector:

```bash
docker run -d \
  --name edot-collector \
  -p 4318:4318 \
  -p 4317:4317 \
  -v ./edot-config.yaml:/etc/otel/config.yaml \
  -e ELASTIC_PASSWORD=changeme \
  docker.elastic.co/observability/elastic-otel-collector:latest
```

**Option B: Kubernetes**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edot-collector
  namespace: elastic
spec:
  replicas: 2
  selector:
    matchLabels:
      app: edot-collector
  template:
    metadata:
      labels:
        app: edot-collector
    spec:
      containers:
      - name: collector
        image: docker.elastic.co/observability/elastic-otel-collector:latest
        ports:
        - containerPort: 4318
          name: otlp-http
        - containerPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        env:
        - name: ELASTIC_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-credentials
              key: password
      volumes:
      - name: config
        configMap:
          name: edot-config
---
apiVersion: v1
kind: Service
metadata:
  name: edot-collector
  namespace: elastic
spec:
  type: ClusterIP
  ports:
  - port: 4318
    targetPort: 4318
    name: otlp-http
  - port: 4317
    targetPort: 4317
    name: otlp-grpc
  selector:
    app: edot-collector
```

### Step 3: Initialize AESOP Indices

The system auto-creates indices on first use, but you can pre-create with proper mappings:

```bash
# Create exploration state index
PUT .aesop-exploration-state
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "execution_id": { "type": "keyword" },
      "cycle_number": { "type": "integer" },
      "discovered_schemas": { "type": "object", "enabled": false },
      "discovered_patterns": { "type": "object", "enabled": false },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}

# Create workflow executions index
PUT .aesop-workflow-executions
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "execution_id": { "type": "keyword" },
      "workflow_name": { "type": "keyword" },
      "status": { "type": "keyword" },
      "started_at": { "type": "date" },
      "completed_at": { "type": "date" },
      "duration_ms": { "type": "long" },
      "metrics": { "type": "object", "enabled": false }
    }
  }
}

# Create proposed skills index
PUT .aesop-proposed-skills
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "skill_id": { "type": "keyword" },
      "skill_name": { "type": "text" },
      "skill_type": { "type": "keyword" },
      "skill_content": { "type": "text" },
      "validation": {
        "properties": {
          "quality_score": { "type": "float" },
          "passed": { "type": "boolean" }
        }
      },
      "review": {
        "properties": {
          "status": { "type": "keyword" },
          "reviewed_at": { "type": "date" },
          "reviewed_by": { "type": "keyword" }
        }
      },
      "created_at": { "type": "date" },
      "metadata": {
        "properties": {
          "cycle_number": { "type": "integer" },
          "execution_id": { "type": "keyword" }
        }
      }
    }
  }
}

# Create rejection feedback index
PUT .aesop-rejection-feedback
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "skill_id": { "type": "keyword" },
      "reason": { "type": "keyword" },
      "feedback": { "type": "text" },
      "rejected_at": { "type": "date" },
      "rejected_by": { "type": "keyword" }
    }
  }
}

# Create discovered relationships index
PUT .aesop-discovered-relationships
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "source_field": { "type": "keyword" },
      "target_field": { "type": "keyword" },
      "relationship_type": { "type": "keyword" },
      "confidence": { "type": "float" },
      "discovered_at": { "type": "date" }
    }
  }
}

# Create discovered patterns index
PUT .aesop-discovered-patterns
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "hidden": true
  },
  "mappings": {
    "properties": {
      "pattern_id": { "type": "keyword" },
      "pattern_type": { "type": "keyword" },
      "pattern_description": { "type": "text" },
      "frequency": { "type": "integer" },
      "discovered_at": { "type": "date" }
    }
  }
}
```

Or use the automated script:

```bash
curl -X POST "http://localhost:5601/internal/aesop/setup/indices" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

### Step 4: Load Demo Data (Optional)

For testing and validation:

```bash
cd x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/
./setup_environment.sh
```

This creates:
- Sample security alerts
- Sample endpoint logs
- Sample SIEM signals
- Pre-populated exploration state

### Step 5: Deploy Monitoring Dashboard

```bash
curl -X POST "http://localhost:5601/internal/aesop/monitoring/dashboard/deploy" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

This creates the "AESOP: Autonomous Skill Discovery - Performance Monitoring" dashboard with:
- Skill invocation metrics
- Success rate by skill type
- Approval rate trend (validates improvement hypothesis)
- Average validation scores
- Exploration duration trend
- Token usage by agent
- Discovery coverage
- Cost efficiency metrics

Access at: `/app/dashboards#/view/aesop-performance-monitoring`

### Step 6: Deploy Alerting Rules

```bash
curl -X POST "http://localhost:5601/internal/aesop/monitoring/alerts/deploy" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

This deploys 8 production alerting rules:
- **CRITICAL:** High exploration failure rate (>10%)
- **HIGH:** Low skill approval rate (<30%)
- **HIGH:** Exploration duration excessive (>4 hours)
- **MEDIUM:** High token usage (>50K per exploration)
- **MEDIUM:** High skill validation failure rate (>15%)
- **MEDIUM:** Approval rate not improving (stagnant trend)
- **MEDIUM:** Low discovery coverage (<50%)
- **LOW:** No recent exploration activity (>7 days)

---

## Configuration

### Exploration Parameters

Default values (modify via API request body):

```json
{
  "agent_role": "SOC analyst",
  "scoped_indices": [
    ".alerts-security.alerts-*",
    ".siem-signals-*",
    "logs-endpoint.*"
  ],
  "exploration_depth": 100,
  "min_pattern_frequency": 10,
  "exploration_mode": "incremental"
}
```

**Parameter descriptions:**

- `agent_role`: The persona the system emulates when discovering skills (e.g., "SOC analyst", "threat hunter", "SIEM engineer")
- `scoped_indices`: Index patterns to explore (limit to relevant data)
- `exploration_depth`: Maximum number of documents to sample per index
- `min_pattern_frequency`: Minimum occurrences for a pattern to be considered significant
- `exploration_mode`: "full" (complete re-discovery) or "incremental" (detect changes only)

### Rate Limits

Default limits (adjust in `kibana.yml` if needed):

```yaml
xpack.evals.aesop.rate_limits:
  explorations_per_hour: 1      # Prevents runaway explorations
  validations_per_hour: 10      # Limits validation workflow triggers
  approvals_per_hour: 20        # Prevents accidental mass approvals
```

### Performance Tuning

**For small environments (50-100 indices):**

```json
{
  "exploration_depth": 50,
  "min_pattern_frequency": 10,
  "exploration_mode": "full"
}
```

**For large environments (500+ indices):**

```json
{
  "exploration_depth": 200,
  "min_pattern_frequency": 5,
  "exploration_mode": "incremental"
}
```

Enable caching (enabled by default):

```yaml
xpack.evals.aesop.caching:
  enabled: true
  ttl_minutes: 60
```

---

## Operational Procedures

### Daily Operations (5-10 minutes)

**Morning Checks:**

1. **Check overnight exploration status:**
   ```bash
   curl -X GET "http://localhost:5601/internal/aesop/exploration/recent?limit=1" \
     -H "kbn-xsrf: true" \
     -u elastic:changeme
   ```

2. **Review proposed skills:**
   Navigate to: `/app/evals/aesop/skills/proposed`

   Or via API:
   ```bash
   curl -X GET "http://localhost:5601/internal/aesop/skills/proposed?status=pending" \
     -H "kbn-xsrf: true" \
     -u elastic:changeme
   ```

3. **Check performance dashboard:**
   Navigate to: `/app/dashboards#/view/aesop-performance-monitoring`

   Key metrics to watch:
   - Exploration success rate (should be >90%)
   - Approval rate trend (should be improving)
   - Token usage (should be <50K per exploration)

**Skill Review Workflow (10-15 minutes per skill):**

For each proposed skill:

1. **Read skill description and use case:**
   - Does it solve a real problem?
   - Is it specific enough to be useful?
   - Does it overlap with existing skills?

2. **Review validation results:**
   - Quality score (should be >0.85)
   - Security scan passed
   - Syntax validation passed

3. **Approve or reject:**

   Approve:
   ```bash
   curl -X POST "http://localhost:5601/internal/aesop/skills/{skillId}/approve" \
     -H "kbn-xsrf: true" \
     -u elastic:changeme
   ```

   Reject:
   ```bash
   curl -X POST "http://localhost:5601/internal/aesop/skills/{skillId}/reject" \
     -H "Content-Type: application/json" \
     -H "kbn-xsrf: true" \
     -u elastic:changeme \
     -d '{
       "reason": "poor_quality",
       "feedback": "Skill is too generic; needs more specific use case"
     }'
   ```

4. **Verify deployment (for approved skills):**
   - Check Agent Builder UI: `/app/agent-builder/skills`
   - Skill should appear immediately after approval

### Weekly Operations

**Full Exploration (Sunday 2 AM recommended):**

Trigger via cron or scheduled workflow:

```bash
# Cron entry (run as kibana user)
0 2 * * 0 curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{"exploration_mode": "full"}'
```

Or use Kibana scheduled workflow (recommended):

1. Navigate to `/app/workflows/schedules`
2. Create schedule:
   - Name: "Weekly AESOP Full Exploration"
   - Workflow: `aesop.self_exploration`
   - Schedule: Cron `0 2 * * 0` (Sunday 2 AM)
   - Parameters: `{"exploration_mode": "full"}`

**Performance Review:**

1. Open monitoring dashboard
2. Review key trends:
   - Approval rate improvement (should increase over cycles)
   - Average exploration duration (should stabilize or decrease)
   - Token usage (should decrease with caching)
   - Skill validation pass rate (should be >85%)

3. Identify underperforming agents:
   - Check "Token Usage by Agent" table
   - High token usage + low success rate = needs tuning

### Monthly Operations

**Cleanup Tasks:**

1. **Archive old exploration states (>90 days):**
   ```bash
   POST /.aesop-exploration-state/_delete_by_query
   {
     "query": {
       "range": {
         "created_at": {
           "lt": "now-90d"
         }
       }
     }
   }
   ```

2. **Review and deprecate unused skills:**
   - Check skill invocation metrics in dashboard
   - Skills with 0 invocations in 30 days → consider deprecation

3. **Update documentation:**
   - Capture new patterns or issues discovered
   - Update runbooks based on operational learnings

---

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting_guide.md) for detailed issue resolution.

### Quick Diagnostics

**Check AESOP system health:**

```bash
curl -X GET "http://localhost:5601/internal/aesop/health" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Check recent errors:**

```bash
GET /.aesop-workflow-executions/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "status": "failed" } },
        { "range": { "started_at": { "gte": "now-24h" } } }
      ]
    }
  },
  "sort": [{ "started_at": "desc" }],
  "size": 10
}
```

---

## Monitoring

### Key Metrics

**Operational Health:**
- Exploration success rate: Target >90%
- Average exploration duration: Target <2h (full), <30min (incremental)
- Workflow timeout rate: Target <5%

**Skill Quality:**
- Approval rate: Target 40% (Cycle 1) → 70% (Cycle 3+)
- Validation pass rate: Target >85%
- Average eval score: Target >0.85

**Cost Efficiency:**
- Token usage: Target <50K per exploration
- Cost per exploration: Target <$25 (full), <$5 (incremental)
- ROI: Target >90% time savings vs manual skill creation

### Dashboards

**Primary Dashboard:**
- Name: "AESOP: Autonomous Skill Discovery - Performance Monitoring"
- URL: `/app/dashboards#/view/aesop-performance-monitoring`
- Refresh interval: Every 5 minutes
- Data retention: 90 days

**Secondary Dashboard (O11y Traces):**
- Name: "Observability Traces"
- URL: `/app/observability/traces`
- Filter: `attributes.aesop.* IS NOT NULL`
- Use for detailed debugging and token usage analysis

### Alerting

Alert rules deployed via `/internal/aesop/monitoring/alerts/deploy`.

View triggered alerts:

```bash
GET /.aesop-alert-rules/_search
{
  "query": {
    "term": { "enabled": true }
  }
}
```

---

## Security

### Access Control

**Current Implementation:** Trust-based (internal routes, no RBAC)

**Production Recommendation:**

Define three roles:

1. **AESOP Viewer:**
   - Can view skills, exploration history
   - Can view dashboards
   - Cannot trigger explorations or approve skills

2. **AESOP Editor:**
   - All Viewer permissions
   - Can trigger explorations
   - Can approve/reject skills
   - Cannot configure system

3. **AESOP Admin:**
   - All Editor permissions
   - Can configure system parameters
   - Can deploy dashboards and alerts

### Data Security

**Sensitive Data Handling:**
- Exploration is read-only (no write access to source indices)
- Alert data may contain PII (user names, IP addresses)
- Skills stored in `.aesop-*` hidden indices (not visible in Discover)
- O11y traces contain prompts (may include sensitive field names)

**Compliance Considerations:**
- All data stays in-cluster (no external SaaS dependencies)
- Data retention configurable per policy
- Trace data can be redacted via EDOT processor

**Example Redaction (EDOT config):**

```yaml
processors:
  attributes:
    actions:
      - key: attributes.gen_ai.prompt
        action: delete  # Remove prompts from traces
      - key: attributes.aesop.field_names
        pattern_replace:
          pattern: '(user|email|ip).*'
          replacement: '[REDACTED]'
```

---

## Scaling

### Single Tenant (Current Implementation)

**Supports:**
- 1 organization/team
- 100-500 indices
- 5-10 explorations per week
- 20-50 skills deployed

**Resource Requirements:**
- Elasticsearch: 4-8GB heap, 2-4 CPU cores
- Kibana: 2-4GB heap, 2 CPU cores
- EDOT Collector: 1GB memory, 1 CPU core

### Multi-Tenant (Future Consideration)

**Would Require:**
- Space isolation (separate `.aesop-*` indices per space)
- Resource quotas (limit explorations per tenant)
- Cost attribution (track token usage by team)
- Separate EDOT collectors per tenant

---

## Backup & Recovery

### State Backup

**Critical Indices to Backup:**
- `.aesop-exploration-state` (latest cycle only needed)
- `.aesop-proposed-skills` (approved skills)
- `.aesop-workflow-executions` (execution history)

**Snapshot Schedule:**

Daily incremental:
```bash
PUT /_snapshot/aesop_backup/snapshot_$(date +%Y%m%d)
{
  "indices": ".aesop-*",
  "ignore_unavailable": true,
  "include_global_state": false
}
```

Weekly full:
```bash
PUT /_snapshot/aesop_backup/full_snapshot_$(date +%Y%m%d)
{
  "indices": ".aesop-*,traces-apm.otel-*",
  "ignore_unavailable": true,
  "include_global_state": false
}
```

Retention: 30 days

### Disaster Recovery

**If exploration state is lost:**

1. Trigger full exploration (recreates baseline):
   ```bash
   curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
     -H "Content-Type: application/json" \
     -H "kbn-xsrf: true" \
     -u elastic:changeme \
     -d '{"exploration_mode": "full"}'
   ```

2. Re-approve skills from proposals:
   - Skills persist in `.aesop-proposed-skills`
   - Review and re-approve as needed

3. Feedback history lost (acceptable):
   - System will rebuild over next 2-3 cycles

**Recovery Targets:**
- RTO (Recovery Time Objective): <4 hours (full exploration time)
- RPO (Recovery Point Objective): 24 hours (daily incremental backup)

---

## Performance Benchmarks

### Expected Performance (100-index environment)

| Operation | Duration | Token Usage | Cost (Claude Sonnet 4.5) |
|-----------|----------|-------------|--------------------------|
| **Full exploration** | 1.5-2 hours | 45-50K tokens | $22-25 |
| **Incremental exploration** | 15-30 min | 7-10K tokens | $3.50-5 |
| **Skill validation** | 20-30 min | 15-20K tokens | $7.50-10 |
| **Skill approval** | <1 min | 0 tokens | $0 |

### Scaling Characteristics

| Environment Size | Full Exploration | Incremental | Skills/Exploration |
|------------------|------------------|-------------|-------------------|
| **Small (50 indices)** | ~1 hour | ~10 min | 2-3 |
| **Medium (200 indices)** | ~3 hours | ~25 min | 5-8 |
| **Large (500 indices)** | ~6 hours | ~45 min | 10-15 |

### Cost Analysis

**Monthly Operating Costs (100-index environment):**

| Component | Cost |
|-----------|------|
| Weekly full exploration (4x/month) | $100 |
| Daily incremental (26x/month) | $130 |
| Skill validations (avg 10/month) | $100 |
| **Total** | **$330/month** |

**ROI Calculation:**

Manual skill creation: ~2 hours per skill × 20 skills/month × $50/hour = **$2,000/month**

Autonomous system cost: **$330/month**

**Savings: $1,670/month (83% reduction)**

---

## Next Steps

1. **Complete Installation:**
   - Follow steps 1-6 to deploy system
   - Verify all indices created
   - Confirm dashboard and alerts deployed

2. **Initial Exploration:**
   - Trigger first full exploration
   - Monitor progress via dashboard
   - Review proposed skills

3. **Establish Operations Rhythm:**
   - Schedule weekly full explorations
   - Set up daily skill review time
   - Configure cron or workflow schedules

4. **Tune and Optimize:**
   - Adjust exploration depth based on environment
   - Refine scoped indices to relevant data
   - Monitor and optimize token usage

5. **Iterate and Improve:**
   - Track approval rate improvement
   - Capture lessons learned
   - Update documentation

---

## Support

**Documentation:**
- [Troubleshooting Guide](./troubleshooting_guide.md)
- [API Reference](./api_reference.md)
- [Developer Guide](./developer_guide.md)

**Internal Resources:**
- Slack: `#evals-aesop` (internal)
- GitHub Issues: `elastic/kibana` (tag: `aesop`)

**Monitoring:**
- Dashboard: `/app/dashboards#/view/aesop-performance-monitoring`
- Traces: `/app/observability/traces` (filter: `attributes.aesop.*`)
