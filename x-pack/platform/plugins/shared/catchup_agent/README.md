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

#### Correlation & Summary Tools (2 tools)

1. **platform.catchup.correlation.engine** - Correlates events across sources by shared identifiers
2. **platform.catchup.summary.generator** - Generates unified markdown or JSON summary

## Implementation Status

### Completed

- ✅ Plugin structure and registration
- ✅ All Security tools (using ES|QL queries)
- ✅ Observability tool (using ES|QL queries)
- ✅ Search tool (using ES|QL queries)
- ✅ Correlation engine (basic correlation logic)
- ✅ Summary generator (markdown and JSON output)
- ✅ Agent registration with all tools
- ✅ Protected namespace registration
- ✅ Allow list updates

### Pending (MVP Stretch Goals)

- ⏳ External API tools - Full implementation requires:
  - Access to encrypted connector secrets via Actions plugin
  - Actual API calls to Slack, GitHub, Gmail
  - Currently placeholder implementations
- ⏳ Enhanced correlation logic (vector embeddings, smarter matching)
- ⏳ Unit and integration tests
- ⏳ Error handling improvements
- ⏳ Rate limiting for external API calls

## Usage

The CatchUp Agent can be used via Agent Builder UI or programmatically:

```typescript
// Example: Call the security summary tool
const result = await onechat.tools.execute({
  toolId: 'platform.catchup.security.summary',
  toolParams: { since: '2025-01-15T00:00:00Z' },
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
