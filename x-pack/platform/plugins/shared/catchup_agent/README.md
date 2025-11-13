# Elastic CatchUp Agent Plugin

A built-in Agent Builder plugin that provides tools and an agent for summarizing updates from Elastic (Security, Observability, Search) and external systems (Slack, GitHub, Gmail) since a given timestamp.

## Overview

The Elastic CatchUp Agent helps users catch up on everything that happened while they were away by providing a context-rich digest that merges Elastic data with third-party context.

## Architecture

### Main Agent

- **ID**: `platform.catchup.agent`
- **Name**: Elastic CatchUp Agent
- **Description**: Provides context-rich summaries of Elastic Security, Observability, Search, and external system activity since a given timestamp

### Tools

#### Security Tools (5 tools)

1. **platform.catchup.security.attack_discoveries** - Retrieves attack discoveries from `.security-attack-discoveries*`
2. **platform.catchup.security.detections** - Summarizes detections from `.siem-signals-*`
3. **platform.catchup.security.cases** - Lists cases from `.cases*`
4. **platform.catchup.security.rule_changes** - Tracks rule changes from `.siem-detection-rules*`
5. **platform.catchup.security.summary** - Orchestrates all security tools in parallel

#### Observability Tool (1 tool)

1. **platform.catchup.observability.summary** - Summarizes alerts from `.alerts-observability*`

#### Search Tool (1 tool)

1. **platform.catchup.search.summary** - Summarizes analytics from `.ent-search-analytics-*`

#### External Tools (3 tools)

1. **platform.catchup.external.slack** - Fetches Slack messages and threads (requires connector)
2. **platform.catchup.external.github** - Summarizes GitHub PRs and issues (requires connector or token)
3. **platform.catchup.external.gmail** - Summarizes Gmail conversations (requires connector)

#### Correlation & Summary Tools (3 tools)

1. **platform.catchup.correlation.engine** - Correlates events across sources by shared identifiers (enhanced with entity extraction)
2. **platform.catchup.correlation.entity_extraction** - Extracts entities (service names, alert IDs, case IDs, PR numbers) from messages/alerts
3. **platform.catchup.summary.generator** - Generates unified markdown or JSON summary

#### Prioritization Tools (1 tool)

1. **platform.catchup.prioritization.rerank** - Uses ES|QL RERANK command to prioritize items by relevance

#### Search Tools (2 tools)

1. **platform.catchup.search.summary** - Summarizes analytics from `.ent-search-analytics-*`
2. **platform.catchup.search.unified_search** - Searches across Security, Observability, Search, and External sources using hybrid search (RRF)

### Workflows

The plugin includes three pre-built workflows that demonstrate orchestration capabilities:

1. **Daily Security Catchup** (`daily_security_catchup`) - Scheduled daily at 8 AM UTC

   - Fetches security summary for last 24 hours
   - Retrieves Slack messages from security channels
   - Correlates security events with Slack discussions
   - Uses reranker to prioritize most critical items
   - Generates formatted summary

2. **Incident Investigation** (`incident_investigation`) - Manual trigger

   - Fetches security alert/case details
   - Searches observability alerts for related service issues
   - Searches Slack for mentions of alert/case ID or service name
   - Searches GitHub for related PRs/issues
   - Correlates all sources using entity extraction
   - Generates comprehensive investigation report

3. **Weekly Team Catchup** (`weekly_team_catchup`) - Scheduled weekly on Mondays at 9 AM UTC
   - Parallel execution: Security, Observability, Search summaries
   - Fetches Slack messages from team channels
   - Fetches GitHub PRs/issues from team repos
   - Uses hybrid search (RRF) to find related content across sources
   - Applies reranker to surface most important updates
   - Generates team digest

## Implementation Status

### Completed

- ✅ Plugin structure and registration
- ✅ All Security tools (using ES|QL queries)
- ✅ Observability tool (using ES|QL queries)
- ✅ Search tool (using ES|QL queries)
- ✅ Correlation engine (enhanced with entity extraction)
- ✅ Entity extraction tool
- ✅ Reranker prioritization tool (using ES|QL RERANK)
- ✅ Unified search tool (demonstrates "Better Together" story)
- ✅ Summary generator (markdown and JSON output)
- ✅ Three workflows (Daily Security Catchup, Incident Investigation, Weekly Team Catchup)
- ✅ Agent registration with all tools
- ✅ Protected namespace registration
- ✅ Allow list updates

### Elastic Differentiators Used

This plugin demonstrates Elastic's search and relevance capabilities:

- **Rerankers**: Uses ES|QL `RERANK` command to prioritize items by relevance
- **Hybrid Search (RRF)**: Combines keyword and semantic search using Reciprocal Rank Fusion (via unified search tool)
- **Entity Extraction**: Identifies and extracts entities (services, alerts, cases, PRs) for correlation
- **"Better Together" Story**: Integrates Security, Observability, and Search solutions with external context

### Pending (Future Enhancements)

- ⏳ Full ES|QL RERANK integration (requires rerank inference endpoint configuration)
- ⏳ Full hybrid search (RRF) implementation with Elasticsearch API
- ⏳ Enhanced entity extraction using Elastic's entity models
- ⏳ Unit and integration tests
- ⏳ Error handling improvements
- ⏳ Rate limiting for external API calls

## Usage

The CatchUp Agent can be used via Agent Builder UI or programmatically:

```typescript
// Example: Call the security summary tool
const result = await onechat.tools.execute({
  toolId: 'platform.catchup.security.summary',
  toolParams: { start: '2025-01-15T00:00:00Z' },
  request,
});
```

## Dependencies

- `onechat` - Agent Builder framework
- `actions` - For connector access (future)
- `security` - Security solution (optional, tools query indices directly)
- `cases` - Cases plugin (optional, tools query indices directly)
- `ruleRegistry` - Rule Registry (optional, for observability alerts)

## Notes

- All Elastic data tools use ES|QL queries to index directly
- External tools are placeholders that need connector secrets access
- Tools validate ISO 8601 datetime format for `since` parameter
- Error handling returns structured error results
- All tools are registered in the `platform.catchup` protected namespace
