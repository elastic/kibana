# AESOP Troubleshooting Guide

This guide provides diagnostic procedures and solutions for common issues with the Autonomous Skill Discovery system.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Exploration Issues](#exploration-issues)
3. [Skill Quality Issues](#skill-quality-issues)
4. [Performance Issues](#performance-issues)
5. [Integration Issues](#integration-issues)
6. [Data Issues](#data-issues)
7. [Monitoring & Alerting Issues](#monitoring--alerting-issues)

---

## Quick Diagnostics

### System Health Check

Run this to get overall system status:

```bash
curl -X GET "http://localhost:5601/internal/aesop/health" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

Expected response:
```json
{
  "status": "healthy",
  "components": {
    "elasticsearch": "available",
    "workflows": "available",
    "agent_builder": "available",
    "edot_collector": "available"
  },
  "last_exploration": "2024-01-15T02:00:00Z",
  "pending_skills": 3,
  "active_explorations": 0
}
```

### Check Recent Errors

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

### Check EDOT Collector Status

```bash
# Docker
docker logs edot-collector --tail 100

# Kubernetes
kubectl logs -n elastic deployment/edot-collector --tail=100
```

---

## Exploration Issues

### Issue: Exploration Stuck/Timeout

**Symptoms:**
- Exploration running >4 hours
- Progress API returns same phase for >1 hour
- No new skills proposed

**Diagnosis:**

1. Check current workflow state:
```bash
curl -X GET "http://localhost:5601/internal/aesop/exploration/{execution_id}/progress" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

2. Check workflow execution details:
```bash
GET /.aesop-workflow-executions/_doc/{execution_id}
```

3. Check agent invocation traces:
```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "attributes.aesop.workflow.execution_id": "{execution_id}" } },
        { "term": { "status.code": "ERROR" } }
      ]
    }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 10
}
```

**Solutions:**

**A. Stuck on schema discovery (most common):**

Problem: Too many indices to analyze

```bash
# Kill stuck workflow
DELETE /.aesop-workflow-executions/_doc/{execution_id}

# Restart with reduced scope
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "scoped_indices": [".alerts-security.alerts-default"],
    "exploration_depth": 50
  }'
```

**B. Stuck on pattern mining:**

Problem: Too many patterns to analyze

```bash
# Increase min_pattern_frequency to filter out noise
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "min_pattern_frequency": 20,
    "exploration_depth": 100
  }'
```

**C. Agent timeout:**

Problem: Claude API timeout or rate limit

Check logs:
```bash
# Kibana logs
grep "AESOP.*timeout" /var/log/kibana/kibana.log | tail -20
```

Solution: Wait 5 minutes and retry (rate limit reset)

### Issue: Exploration Fails Immediately

**Symptoms:**
- Status changes to "failed" within seconds
- Error message in response

**Diagnosis:**

Check error message:
```bash
GET /.aesop-workflow-executions/_doc/{execution_id}
```

**Common Error Messages:**

**1. "Workflows Management plugin not available"**

Solution: Enable workflows plugin in `kibana.yml`:
```yaml
xpack.workflows.enabled: true
```

Restart Kibana.

**2. "No indices match pattern"**

Solution: Verify scoped_indices exist:
```bash
GET /_cat/indices/.alerts-security.alerts-*?v
```

If no indices, check:
- Security solution is generating alerts
- Index lifecycle policy is correct
- Permissions allow reading indices

**3. "Agent Builder not available"**

Solution: Enable Agent Builder plugin:
```yaml
xpack.agentBuilder.enabled: true
```

**4. "Insufficient permissions"**

Solution: Grant user `evals` privilege:
```bash
POST /_security/role/aesop_user
{
  "cluster": ["manage_own_api_key"],
  "indices": [
    {
      "names": [".aesop-*", ".alerts-*", ".siem-*", "logs-*", "traces-*"],
      "privileges": ["read", "write", "create_index"]
    }
  ],
  "applications": [
    {
      "application": "kibana-.kibana",
      "privileges": ["feature_evals.all"],
      "resources": ["*"]
    }
  ]
}
```

### Issue: No Skills Proposed

**Symptoms:**
- Exploration completes successfully
- No skills in proposed list
- `metrics.skills_proposed: 0`

**Diagnosis:**

1. Check exploration depth and coverage:
```bash
GET /.aesop-workflow-executions/_search
{
  "query": {
    "term": { "workflow_name": "aesop.self_exploration" }
  },
  "sort": [{ "started_at": "desc" }],
  "size": 1,
  "_source": ["metrics"]
}
```

2. Check discovered patterns:
```bash
GET /.aesop-discovered-patterns/_search
{
  "query": {
    "range": { "discovered_at": { "gte": "now-1d" } }
  }
}
```

**Solutions:**

**A. Insufficient data:**

Problem: Not enough documents sampled

```bash
# Increase exploration depth
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "exploration_depth": 200,
    "min_pattern_frequency": 5
  }'
```

**B. Patterns too infrequent:**

Problem: min_pattern_frequency too high

```bash
# Lower threshold
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "min_pattern_frequency": 3
  }'
```

**C. Data too uniform:**

Problem: All alerts/logs look the same (no distinct patterns)

Solution: Expand scoped_indices to include more diverse data:
```json
{
  "scoped_indices": [
    ".alerts-security.alerts-*",
    "logs-endpoint.*",
    "logs-windows.*",
    "logs-network.*"
  ]
}
```

---

## Skill Quality Issues

### Issue: Low Approval Rate (<40%)

**Symptoms:**
- Most proposed skills are rejected
- Skills are generic or not useful
- Skills overlap with existing

**Diagnosis:**

1. Check rejection feedback:
```bash
GET /.aesop-rejection-feedback/_search
{
  "query": {
    "range": { "rejected_at": { "gte": "now-7d" } }
  },
  "aggs": {
    "rejection_reasons": {
      "terms": { "field": "reason" }
    }
  }
}
```

2. Review proposed skill content:
```bash
curl -X GET "http://localhost:5601/internal/aesop/skills/proposed?status=rejected&limit=10" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Solutions:**

**A. "poor_quality" rejections:**

Problem: System generating low-quality skills

The system should auto-adjust after 2-3 cycles. If not:

1. Check if feedback is being incorporated:
```bash
GET /.aesop-exploration-state/_search
{
  "query": {
    "exists": { "field": "feedback_summary" }
  },
  "sort": [{ "created_at": "desc" }],
  "size": 1
}
```

2. If no feedback_summary, feedback loop is broken:
```bash
# Check feedback analyzer agent logs
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.agent.id": "aesop.feedback_analyzer" }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 10
}
```

**B. "not_useful" rejections:**

Problem: Skills don't match user role/needs

Solution: Refine agent_role and scoped_indices:
```json
{
  "agent_role": "Threat hunter investigating lateral movement",
  "scoped_indices": [
    ".alerts-security.alerts-*",
    "logs-windows.security-*",
    "logs-network.flow-*"
  ]
}
```

**C. "overlaps_existing" rejections:**

Problem: Duplicate skills being proposed

Solution: Enable similarity detection (future feature) or manually track:
```bash
# Create manual exclusion list
PUT /.aesop-exploration-state/_doc/current
{
  "existing_skills": [
    "security.alert.triage",
    "security.alert.enrichment",
    "security.timeline.analysis"
  ]
}
```

### Issue: Skills Fail Validation

**Symptoms:**
- Validation status shows `"passed": false`
- Quality score <0.85
- Security scan failures

**Diagnosis:**

1. Check validation results:
```bash
GET /.aesop-proposed-skills/_search
{
  "query": {
    "term": { "validation.passed": false }
  },
  "size": 10
}
```

2. Check validation workflow logs:
```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.workflow.name": "aesop.skill_validation" }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 20
}
```

**Solutions:**

**A. Syntax errors:**

Problem: Skill content has invalid markdown/format

This indicates a prompt engineering issue. Report to engineering team.

**B. Security scan failures:**

Problem: Skill contains potentially unsafe operations

Review skill content:
```bash
GET /.aesop-proposed-skills/_doc/{skill_id}
```

Check if skill attempts:
- Write operations (should be read-only)
- External API calls (not allowed)
- Code execution (blocked)

If false positive, whitelist pattern (requires code change).

**C. Low quality score:**

Problem: Skill is too generic or poorly explained

The system learns from these over time. For immediate fix:
- Provide detailed rejection feedback
- Be specific about what's missing

---

## Performance Issues

### Issue: High Token Usage (>50K per Exploration)

**Symptoms:**
- Token usage exceeds budget
- High cost per exploration
- Slow exploration times

**Diagnosis:**

1. Check token usage by agent:
```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.workflow.execution_id": "{execution_id}" }
  },
  "aggs": {
    "by_agent": {
      "terms": {
        "field": "attributes.aesop.agent.id",
        "size": 20
      },
      "aggs": {
        "total_tokens": {
          "sum": {
            "script": {
              "source": "doc['attributes.gen_ai.usage.prompt_tokens'].value + doc['attributes.gen_ai.usage.completion_tokens'].value"
            }
          }
        }
      }
    }
  }
}
```

2. Check cache hit rate:
```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.workflow.execution_id": "{execution_id}" }
  },
  "aggs": {
    "cache_stats": {
      "stats": {
        "field": "attributes.gen_ai.usage.prompt_tokens_cached"
      }
    }
  }
}
```

**Solutions:**

**A. Low cache hit rate (<30%):**

Problem: Prompt caching not working

1. Verify EDOT collector is capturing cached tokens:
```yaml
# edot-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  elasticsearch:
    endpoints: [http://elasticsearch:9200]
    traces_index: traces-apm.otel-*
    # Ensure all usage fields are captured
    mapping:
      mode: ecs
```

2. Check if Agent Builder supports caching:
```bash
# Verify cached tokens field exists
GET /traces-apm.otel-*/_search
{
  "query": {
    "exists": { "field": "attributes.gen_ai.usage.prompt_tokens_cached" }
  },
  "size": 1
}
```

**B. High token usage in pattern_miner agent:**

Problem: Too many patterns being analyzed

Solution: Increase min_pattern_frequency:
```json
{
  "min_pattern_frequency": 15
}
```

**C. High token usage in schema_categorizer agent:**

Problem: Too many indices

Solution: Reduce scoped_indices or use incremental mode:
```json
{
  "scoped_indices": [".alerts-security.alerts-default"],
  "exploration_mode": "incremental"
}
```

### Issue: Slow Exploration (>2 Hours for Full)

**Symptoms:**
- Full exploration takes >3 hours
- Incremental takes >45 minutes
- Users waiting too long for results

**Diagnosis:**

1. Check exploration duration trend:
```bash
GET /.aesop-workflow-executions/_search
{
  "query": {
    "term": { "workflow_name": "aesop.self_exploration" }
  },
  "sort": [{ "started_at": "desc" }],
  "size": 10,
  "_source": ["started_at", "duration_ms", "status"]
}
```

2. Identify slow phases:
```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.workflow.execution_id": "{execution_id}" }
  },
  "aggs": {
    "by_phase": {
      "terms": {
        "field": "attributes.aesop.workflow.phase",
        "size": 10
      },
      "aggs": {
        "avg_duration": {
          "avg": { "field": "duration_ms" }
        }
      }
    }
  }
}
```

**Solutions:**

**A. Schema discovery slow:**

Solution: Reduce number of indices or use caching:
```json
{
  "scoped_indices": [".alerts-security.alerts-default"],
  "exploration_depth": 50
}
```

**B. Pattern mining slow:**

Solution: Reduce exploration depth:
```json
{
  "exploration_depth": 75,
  "min_pattern_frequency": 15
}
```

**C. Skill generation slow:**

Problem: Too many patterns → too many skills

Solution: Be more selective:
```json
{
  "min_pattern_frequency": 20,
  "exploration_depth": 100
}
```

---

## Integration Issues

### Issue: EDOT Collector Not Receiving Traces

**Symptoms:**
- No traces in `traces-apm.otel-*`
- Token usage metrics missing
- Dashboard shows no data

**Diagnosis:**

1. Check EDOT collector health:
```bash
# Docker
docker logs edot-collector --tail 50 | grep -i error

# Kubernetes
kubectl logs -n elastic deployment/edot-collector --tail=50 | grep -i error
```

2. Check if Kibana is sending traces:
```bash
# Check Kibana config
grep -i "otel" /etc/kibana/kibana.yml
```

3. Test EDOT endpoint:
```bash
curl -X POST "http://localhost:4318/v1/traces" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {"attributes": [{"key": "test", "value": {"stringValue": "test"}}]},
      "scopeSpans": []
    }]
  }'
```

**Solutions:**

**A. EDOT collector not running:**

```bash
# Docker
docker start edot-collector

# Kubernetes
kubectl rollout restart -n elastic deployment/edot-collector
```

**B. Kibana not configured to send traces:**

Add to `kibana.yml`:
```yaml
observability:
  otel:
    enabled: true
    endpoint: http://localhost:4318/v1/traces
    headers:
      Authorization: "Bearer ${ELASTIC_APM_SECRET_TOKEN}"
```

**C. Firewall blocking port 4318:**

```bash
# Test connectivity
telnet localhost 4318

# If fails, check firewall
sudo ufw allow 4318/tcp  # Ubuntu
sudo firewall-cmd --add-port=4318/tcp --permanent  # RHEL
```

### Issue: Agent Builder Not Deploying Skills

**Symptoms:**
- Skills approved successfully
- Skills don't appear in Agent Builder UI
- Agent Builder API returns 404

**Diagnosis:**

1. Check if Agent Builder is enabled:
```bash
curl -X GET "http://localhost:5601/api/agent_builder/status" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

2. Check approved skills:
```bash
GET /.aesop-proposed-skills/_search
{
  "query": {
    "term": { "review.status": "approved" }
  },
  "sort": [{ "review.reviewed_at": "desc" }],
  "size": 10
}
```

3. Check Agent Builder skill list:
```bash
curl -X GET "http://localhost:5601/api/agent_builder/skills" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**Solutions:**

**A. Agent Builder not enabled:**

Enable in `kibana.yml`:
```yaml
xpack.agentBuilder.enabled: true
```

**B. Deployment API call failed:**

Check approval route logs:
```bash
grep "approve_skill" /var/log/kibana/kibana.log | tail -20
```

If API error, retry manually:
```bash
curl -X POST "http://localhost:5601/api/agent_builder/skills" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "id": "aesop.generated.{skill_id}",
    "name": "{skill_name}",
    "content": "{skill_content}"
  }'
```

---

## Data Issues

### Issue: Exploration State Lost

**Symptoms:**
- System acts like it's first run (despite previous explorations)
- Cycle number resets to 1
- Feedback not incorporated

**Diagnosis:**

```bash
GET /.aesop-exploration-state/_search
{
  "query": {
    "match_all": {}
  },
  "sort": [{ "created_at": "desc" }],
  "size": 5
}
```

**Solutions:**

**A. Index accidentally deleted:**

Restore from snapshot:
```bash
# List snapshots
GET /_snapshot/aesop_backup/_all

# Restore latest
POST /_snapshot/aesop_backup/snapshot_20240115/_restore
{
  "indices": ".aesop-exploration-state",
  "ignore_unavailable": true
}
```

**B. No snapshots available:**

Trigger full exploration (system will rebuild state):
```bash
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "exploration_mode": "full"
  }'
```

System will start from cycle 1 but will improve quickly with feedback.

### Issue: Duplicate Skills

**Symptoms:**
- Same skill proposed multiple times
- Skills with minor variations
- Users rejecting for "overlaps_existing"

**Diagnosis:**

1. Check for duplicates:
```bash
GET /.aesop-proposed-skills/_search
{
  "query": {
    "match_all": {}
  },
  "aggs": {
    "duplicate_names": {
      "terms": {
        "field": "skill_name.keyword",
        "min_doc_count": 2
      }
    }
  }
}
```

2. Check similarity scores (future feature):
```bash
# Will be available in future version
GET /.aesop-proposed-skills/_search
{
  "query": {
    "term": { "metadata.similarity_score": { "gte": 0.8 } }
  }
}
```

**Solutions:**

**A. Manual deduplication:**

```bash
# Delete duplicate
DELETE /.aesop-proposed-skills/_doc/{duplicate_skill_id}
```

**B. Provide rejection feedback:**

When rejecting duplicate:
```bash
curl -X POST "http://localhost:5601/internal/aesop/skills/{skill_id}/reject" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "reason": "overlaps_existing",
    "feedback": "This skill is identical to aesop.generated.alert_triage_v1. Check for existing skills before proposing new ones."
  }'
```

System will learn to avoid duplicates in future cycles.

---

## Monitoring & Alerting Issues

### Issue: Dashboard Shows No Data

**Symptoms:**
- All panels empty
- "No results found" messages
- Time range correct

**Diagnosis:**

1. Check if indices exist:
```bash
GET /_cat/indices/.aesop-*,traces-apm.otel-*?v
```

2. Check data in indices:
```bash
GET /.aesop-workflow-executions/_count
GET /.aesop-proposed-skills/_count
GET /traces-apm.otel-*/_count
```

3. Check dashboard saved object:
```bash
GET /.kibana/_search
{
  "query": {
    "term": { "_id": "dashboard:aesop-performance-monitoring" }
  }
}
```

**Solutions:**

**A. No explorations run yet:**

Trigger first exploration:
```bash
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{}'
```

**B. Dashboard not deployed:**

Deploy dashboard:
```bash
curl -X POST "http://localhost:5601/internal/aesop/monitoring/dashboard/deploy" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**C. Index pattern missing:**

Create index patterns:
```bash
POST /api/index_patterns/index_pattern
{
  "index_pattern": {
    "title": ".aesop-*",
    "timeFieldName": "created_at"
  }
}

POST /api/index_patterns/index_pattern
{
  "index_pattern": {
    "title": "traces-apm.otel-*",
    "timeFieldName": "@timestamp"
  }
}
```

### Issue: Alerts Not Triggering

**Symptoms:**
- Known issues not generating alerts
- Alert rules exist but don't fire
- No notifications

**Diagnosis:**

1. Check if rules deployed:
```bash
GET /.aesop-alert-rules/_count
```

2. Check rule evaluation (future feature):
```bash
# Will be available when integrated with Kibana Alerting
GET /.kibana_alerting_cases/_search
{
  "query": {
    "prefix": { "_id": "alert:aesop." }
  }
}
```

3. Manually evaluate rule:
```bash
# Example: Check exploration failure rate
GET /.aesop-workflow-executions/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "workflow_name": "aesop.self_exploration" } },
        { "range": { "started_at": { "gte": "now-24h" } } }
      ]
    }
  },
  "aggs": {
    "total": { "value_count": { "field": "_id" } },
    "failures": {
      "filter": { "term": { "status": "failed" } }
    }
  }
}
```

**Solutions:**

**A. Rules not deployed:**

```bash
curl -X POST "http://localhost:5601/internal/aesop/monitoring/alerts/deploy" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme
```

**B. Integration with Kibana Alerting needed (future feature):**

Currently rules are stored but not automatically evaluated.
Manual monitoring via dashboard is required.

Future enhancement: Integrate with Kibana Alerting framework.

---

## Getting Help

### Before Contacting Support

1. Collect diagnostic information:
```bash
# System health
curl -X GET "http://localhost:5601/internal/aesop/health" > aesop_health.json

# Recent errors
GET /.aesop-workflow-executions/_search?q=status:failed&sort=started_at:desc > aesop_errors.json

# Trace sample
GET /traces-apm.otel-*/_search?size=10&sort=@timestamp:desc > aesop_traces.json
```

2. Check logs:
```bash
# Kibana logs
tail -1000 /var/log/kibana/kibana.log | grep AESOP > aesop_logs.txt

# EDOT logs
docker logs edot-collector --tail 500 > edot_logs.txt
```

3. Document:
- What were you trying to do?
- What happened instead?
- Any error messages?
- Steps to reproduce?

### Internal Resources

- **Slack:** `#evals-aesop`
- **GitHub Issues:** `elastic/kibana` (tag: `aesop`)
- **Documentation:** `/docs` directory

### Support Escalation

1. **Level 1:** Check this troubleshooting guide
2. **Level 2:** Search Slack channel history
3. **Level 3:** Post in Slack with diagnostics
4. **Level 4:** Create GitHub issue with full details
