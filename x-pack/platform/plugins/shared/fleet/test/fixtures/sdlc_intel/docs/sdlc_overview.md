# SDLC Intelligence

This integration provides visibility into your software development lifecycle by:

1. **Ingesting** GitHub PR and commit data via GraphQL workflows
2. **Analyzing** coverage gaps and bottlenecks using Agent Builder agents
3. **Materializing** summary snapshots for dashboards

## Data flow

```
GitHub GraphQL → elasticsearch.bulk → sdlc-prs index
                                          ↓
                              ai.agent (coverage analysis)
                                          ↓
                              sdlc-coverage-summary index
```

## Configuration

Set the `github_connector_id` variable to your GitHub inference connector ID.
Set `analysis_window_days` to control how far back the analysis looks.
