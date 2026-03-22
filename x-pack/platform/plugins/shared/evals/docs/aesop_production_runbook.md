# AESOP Production Runbook

**Autonomous Exploration for Skill Opportunity Probing (AESOP)**

This runbook provides operational guidance for managing the AESOP autonomous skill discovery system in production.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Common Failure Modes](#common-failure-modes)
4. [Incident Response Procedures](#incident-response-procedures)
5. [Operational Tasks](#operational-tasks)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Escalation Procedures](#escalation-procedures)

---

## System Overview

### Architecture

AESOP is an autonomous system that:
1. Explores Elasticsearch data to discover skill opportunities
2. Generates skill proposals using LLM agents
3. Validates proposals for quality and security
4. Requires human approval before deployment
5. Learns from feedback to improve future proposals

### Key Components

| Component | Purpose | Index/Resource |
|-----------|---------|----------------|
| Workflow Executor | Orchestrates exploration cycles | `.aesop-workflow-executions` |
| Schema Discovery | Identifies data patterns | Ephemeral (in-memory) |
| Skill Generator | Creates skill proposals | `.aesop-proposed-skills` |
| Skill Validator | Quality/security checks | Embedded in proposals |
| Feedback Loop | Learns from rejections | `.aesop-feedback-history` |
| APM Instrumentation | Performance tracking | `aesop_metrics` |

### Key Metrics

- **Approval Rate**: % of proposed skills approved by humans (target: >60%)
- **Exploration Duration**: Time to complete one cycle (target: 1-2 hours)
- **Token Cost**: LLM usage per exploration (budget: <$50/cycle)
- **Quality Score**: Average validation score (target: >0.7)
- **Cache Hit Rate**: Prompt caching effectiveness (target: >60%)

---

## Monitoring & Alerting

### Dashboards

**Primary Dashboard**: [AESOP Performance Monitoring](#/dashboard/aesop-performance-monitoring)

Key panels:
- Skill invocation trends
- Success rate by type
- Approval rate by cycle (validates improvement hypothesis)
- Token usage and cost efficiency
- Exploration duration trends
- Coverage metrics

### Alert Rules

All alerts are sent to `#security-ai-alerts` Slack channel.

#### CRITICAL Alerts

| Alert | Threshold | Action Required |
|-------|-----------|-----------------|
| **High Exploration Failure Rate** | >3 failures in 24h | Check workflow logs, verify cluster health |
| **Workflow Timeout** | Running >4 hours | Cancel stuck workflow, investigate root cause |
| **Token Cost Overrun** | >$50 in 1 hour | PAUSE workflow, check for prompt explosion |

#### WARNING Alerts

| Alert | Threshold | Action Required |
|-------|-----------|-----------------|
| **Approval Rate Regression** | <40% | Review rejected skills, check feedback loop |
| **Security Violation Rate** | >20% in 24h | Audit security validation, review prompts |
| **Data Quality Issues** | Avg quality score <0.7 | Check schema discovery output |

#### INFO Alerts

| Alert | Threshold | Action Required |
|-------|-----------|-----------------|
| **Low Cache Hit Rate** | <60% | Review prompt stability, check caching config |

---

## Common Failure Modes

### 1. Workflow Execution Failures

**Symptoms:**
- Alert: "High Exploration Failure Rate"
- Status: `failed` in `.aesop-workflow-executions`

**Common Causes:**

#### A. Elasticsearch Cluster Issues
```bash
# Check cluster health
GET /_cluster/health

# Check disk space
GET /_cat/nodes?v&h=name,disk.used_percent,heap.percent

# Common fix: Increase disk space or clean old indices
```

#### B. Permission/Security Errors
```bash
# Check workflow execution logs
GET .aesop-workflow-executions/_search
{
  "query": { "term": { "status": "failed" } },
  "sort": [{ "started_at": "desc" }],
  "size": 1
}

# Look for error_message field
# Common fix: Verify API key has correct privileges
```

#### C. Agent API Timeouts
- LLM provider rate limiting
- Network connectivity issues
- Agent timeout configuration too short

**Resolution:**
1. Identify error from `.aesop-workflow-executions` index
2. Check Kibana server logs for full stack traces
3. Apply specific fix based on error type
4. Re-run exploration with same parameters

---

### 2. Workflow Timeout (Hung Execution)

**Symptoms:**
- Alert: "Workflow Timeout Alert"
- Workflow running >4 hours (expected: 1-2 hours)

**Common Causes:**
- Infinite loop in agent invocation
- Elasticsearch query hanging
- Resource starvation (CPU/memory)

**Resolution:**

```bash
# 1. Identify hung execution
GET .aesop-workflow-executions/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "status": "running" } },
        { "range": { "started_at": { "lt": "now-4h" } } }
      ]
    }
  }
}

# 2. Cancel workflow (via Workflows Management API)
POST /api/workflows_management/v1/executions/{execution_id}/_cancel

# 3. Check Kibana logs for stuck operations
# Look for: "AESOP APM" logs with long durations

# 4. Restart exploration after identifying root cause
```

**Prevention:**
- Review agent timeout configurations
- Add circuit breakers for repeated failures
- Monitor query performance in APM dashboard

---

### 3. Low Approval Rate (<40%)

**Symptoms:**
- Alert: "Approval Rate Regression"
- Dashboard shows declining approval trend

**Investigation Steps:**

```bash
# 1. Review rejected skills from latest cycle
GET .aesop-proposed-skills/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "review.status": "rejected" } },
        {
          "term": {
            "metadata.cycle_number": {
              "value": "<latest_cycle_number>"
            }
          }
        }
      ]
    }
  }
}

# 2. Extract common rejection reasons
# Look at: review.rejection_reason field

# 3. Check feedback loader is working
GET .aesop-feedback-history/_count
# Should increase after each cycle

# 4. Verify agent prompts haven't been corrupted
# Check: server/lib/aesop/agents/ for prompt drift
```

**Common Fixes:**
1. **Feedback loop not incorporating rejections**
   - Verify feedback loader is running
   - Check rejection reasons are being parsed correctly

2. **Low-quality patterns discovered**
   - Adjust `min_pattern_frequency` parameter
   - Review scoped indices for data quality

3. **Agent prompt drift**
   - Restore original agent prompts from git
   - Review recent changes to agent definitions

---

### 4. Token Cost Overrun (>$50/hour)

**Symptoms:**
- Alert: "Token Cost Overrun"
- Spike in token usage metrics

**IMMEDIATE ACTION:**
```bash
# PAUSE all running explorations
POST /api/workflows_management/v1/executions/{execution_id}/_cancel
```

**Investigation:**

```bash
# 1. Check token usage by agent
GET aesop_metrics/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "type": "agent_execution" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_agent": {
      "terms": { "field": "metadata.agent_id" },
      "aggs": {
        "total_tokens": {
          "sum": {
            "script": {
              "source": "doc['metadata.prompt_tokens'].value + doc['metadata.completion_tokens'].value"
            }
          }
        }
      }
    }
  }
}

# 2. Look for prompt explosion
# Check if prompt_tokens are abnormally high (>100k per call)

# 3. Verify caching is enabled
# Check metadata.cached_tokens field
```

**Common Causes:**
1. **Prompt explosion**
   - Schema discovery returning massive context
   - Fix: Limit schema discovery results per agent call

2. **Cache not working**
   - Prompts changing on every invocation
   - Fix: Review prompt construction for stability

3. **Infinite agent loop**
   - Agent retrying without backoff
   - Fix: Add circuit breaker logic

**Prevention:**
- Set per-agent token limits
- Enable prompt caching aggressively
- Monitor token usage dashboard daily

---

### 5. Security Violation Rate (>20%)

**Symptoms:**
- Alert: "Security Violation Rate High"
- Many skills rejected for security reasons

**Investigation:**

```bash
# Check security violations
GET .aesop-proposed-skills/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "review.status": "rejected" } },
        { "exists": { "field": "validation.security_violations" } }
      ]
    }
  }
}

# Common violations:
# - Write operations detected
# - Accessing restricted indices
# - Input sanitization failures
```

**Resolution:**
1. Review `validation.security_violations` field
2. Check if read-only enforcer is working:
   - File: `server/lib/aesop/security/read_only_enforcer.ts`
3. Audit agent prompts for security instructions
4. Verify input sanitization in skill generator

**If pattern persists:**
- Add security examples to agent prompts
- Strengthen validation rules
- Consider pausing explorations until fixed

---

## Incident Response Procedures

### Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **P1 - Critical** | System completely down, no skills being generated | 15 minutes |
| **P2 - High** | System degraded, approval rate <20%, cost >2x budget | 1 hour |
| **P3 - Medium** | Performance degraded, approval rate 20-40% | 4 hours |
| **P4 - Low** | Minor issues, metrics slightly off targets | 1 business day |

### P1 Response: System Down

1. **Acknowledge** alert in #security-ai-alerts
2. **Assess** impact:
   ```bash
   # Check cluster health
   GET /_cluster/health

   # Check recent failures
   GET .aesop-workflow-executions/_search
   {
     "query": { "term": { "status": "failed" } },
     "sort": [{ "started_at": "desc" }],
     "size": 5
   }
   ```
3. **Mitigate**:
   - Cancel stuck workflows
   - Clear error conditions (restart services if needed)
4. **Restore** service:
   - Re-run exploration with validated parameters
5. **Document** incident in #security-ai-alerts
6. **Post-mortem** within 48 hours

### P2 Response: System Degraded

1. **Identify** degradation source (approval rate, cost, quality)
2. **Isolate** affected component (use APM metrics)
3. **Apply** fix from troubleshooting guide
4. **Monitor** recovery
5. **Document** findings

---

## Operational Tasks

### Daily Tasks

1. **Check Dashboard** ([AESOP Performance Monitoring](#/dashboard/aesop-performance-monitoring))
   - Review approval rate trend (should be increasing)
   - Check token costs are within budget
   - Verify no stuck workflows (>4 hours)

2. **Review Alerts**
   - Acknowledge and resolve any WARNING/INFO alerts
   - Document patterns in #security-ai-alerts

### Weekly Tasks

1. **Review Proposed Skills**
   ```bash
   # Get pending skills for review
   GET .aesop-proposed-skills/_search
   {
     "query": { "term": { "review.status": "pending" } },
     "sort": [{ "created_at": "desc" }]
   }
   ```
   - Approve high-quality skills
   - Reject with detailed reasons (feeds feedback loop)

2. **Analyze Trends**
   - Approval rate over time (should be increasing)
   - Cost efficiency improvements
   - Coverage expansion

3. **Clean Up Old Data**
   ```bash
   # Delete workflow executions older than 90 days
   POST .aesop-workflow-executions/_delete_by_query
   {
     "query": {
       "range": {
         "started_at": {
           "lt": "now-90d"
         }
       }
     }
   }
   ```

### Monthly Tasks

1. **Review System Performance**
   - Approval rate targets (>60%)
   - Cost per skill generated
   - Quality score trends

2. **Update Alerting Thresholds**
   - Adjust based on actual performance
   - Add new alerts for emerging patterns

3. **Agent Prompt Review**
   - Check for drift or degradation
   - Incorporate learnings from feedback

---

## Troubleshooting Guide

### How to Restart a Failed Exploration

```bash
# 1. Get the failed execution details
GET .aesop-workflow-executions/_doc/{execution_id}

# 2. Extract original parameters
# Look for: scoped_indices, exploration_depth, agent_role

# 3. Re-run with same parameters
POST /internal/aesop/exploration/run
{
  "agent_role": "SOC analyst",
  "scoped_indices": [".alerts-security.alerts-*"],
  "exploration_depth": 100,
  "min_pattern_frequency": 10
}
```

### How to Rollback a Deployed Skill

```bash
# 1. Get skill details
GET .aesop-proposed-skills/_doc/{skill_id}

# 2. Mark as rejected (prevent auto-deployment)
POST /internal/aesop/skills/{skill_id}/reject
{
  "rejection_reason": "Rollback due to production issue: <describe issue>"
}

# 3. Remove from deployed skills registry
# (Manual step - depends on deployment mechanism)
```

### How to Debug Low Approval Rates

```bash
# 1. Get rejection statistics by reason
GET .aesop-proposed-skills/_search
{
  "size": 0,
  "query": { "term": { "review.status": "rejected" } },
  "aggs": {
    "rejection_reasons": {
      "terms": {
        "field": "review.rejection_reason.keyword",
        "size": 10
      }
    }
  }
}

# 2. Review specific rejected skills
GET .aesop-proposed-skills/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "review.status": "rejected" } },
        { "match": { "review.rejection_reason": "<common_reason>" } }
      ]
    }
  }
}

# 3. Check if feedback is being incorporated
GET .aesop-feedback-history/_search
{
  "query": { "term": { "feedback_type": "rejection" } },
  "sort": [{ "created_at": "desc" }],
  "size": 5
}
```

### How to Investigate High Token Costs

```bash
# 1. Get token usage by agent (last hour)
GET aesop_metrics/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "type": "agent_execution" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_agent": {
      "terms": { "field": "metadata.agent_id" },
      "aggs": {
        "avg_prompt_tokens": { "avg": { "field": "metadata.prompt_tokens" } },
        "avg_completion_tokens": { "avg": { "field": "metadata.completion_tokens" } },
        "total_cost": {
          "sum": {
            "script": {
              "source": "(doc['metadata.prompt_tokens'].value / 1000000.0 * 3.0) + (doc['metadata.completion_tokens'].value / 1000000.0 * 15.0)"
            }
          }
        }
      }
    }
  }
}

# 2. Check for prompt explosion
# If avg_prompt_tokens > 100k per call:
#   - Review schema discovery output size
#   - Limit context sent to agents

# 3. Verify caching is working
GET aesop_metrics/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "type": "agent_execution" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "cache_hit_rate": {
      "avg": {
        "script": {
          "source": "doc['metadata.cached_tokens'].size() > 0 ? (doc['metadata.cached_tokens'].value / doc['metadata.prompt_tokens'].value * 100) : 0"
        }
      }
    }
  }
}
# Target: >60% cache hit rate
```

---

## Escalation Procedures

### When to Escalate

Escalate to Security AI team when:
1. **P1 incident** cannot be resolved within 1 hour
2. **Repeated failures** with same root cause (>3 in 24h)
3. **Security concerns** with generated skills
4. **Data corruption** in AESOP indices
5. **Unexpected behavior** not covered in runbook

### Escalation Contacts

| Team | Contact | Escalation For |
|------|---------|----------------|
| **Security AI** | #security-ai | System-wide issues, agent problems |
| **Platform** | #kibana-platform | Workflow execution, API issues |
| **Security** | #security-team | Security violations, compliance |
| **Elasticsearch** | #es-platform | Cluster health, query performance |

### Escalation Information to Provide

When escalating, include:
1. **Incident summary**: What's broken, impact, when it started
2. **Logs**: Recent entries from `.aesop-workflow-executions`
3. **Metrics**: Screenshots from APM dashboard
4. **Actions taken**: What you've tried, results
5. **Urgency**: P1/P2/P3/P4 classification

---

## Appendix

### Useful Queries

#### Get Latest Exploration Status
```bash
GET .aesop-workflow-executions/_search
{
  "query": { "match_all": {} },
  "sort": [{ "started_at": "desc" }],
  "size": 1
}
```

#### Get Pending Skill Reviews
```bash
GET .aesop-proposed-skills/_count
{
  "query": { "term": { "review.status": "pending" } }
}
```

#### Get Approval Rate (Last 7 Days)
```bash
GET .aesop-proposed-skills/_search
{
  "size": 0,
  "query": {
    "range": { "created_at": { "gte": "now-7d" } }
  },
  "aggs": {
    "approval_rate": {
      "filters": {
        "filters": {
          "approved": { "term": { "review.status": "approved" } },
          "rejected": { "term": { "review.status": "rejected" } },
          "pending": { "term": { "review.status": "pending" } }
        }
      }
    }
  }
}
```

### Related Documentation

- [AESOP Architecture](./aesop_architecture.md)
- [Agent Prompt Reference](./aesop_agent_prompts.md)
- [Security Validation Guide](./aesop_security_validation.md)
- [Workflow YAML Specification](./workflows/aesop_self_exploration.yaml)

---

**Last Updated**: 2026-03-22
**Maintained By**: Security AI Team
**Feedback**: #security-ai
