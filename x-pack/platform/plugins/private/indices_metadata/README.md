# Indices Metadata Plugin

Plugin for managing and retrieving metadata about indices in
Kibana. This plugin collects and processes metadata from Elasticsearch indices,
data streams, ILM policies, and index templates.

## Overview

The Indices Metadata plugin is owned by the Security Solution team and provides:

1. **Automated metadata collection** — Runs scheduled tasks to gather indices
   metadata
2. **Analytics integration** — Sends telemetry events for indices statistics
   and configurations
3. **Data stream monitoring** — Tracks data streams and their associated
   metadata

## Features

- **Index Statistics Collection**: Gathers comprehensive statistics about indices
- **Data Stream Monitoring**: Tracks data streams and their metadata
- **ILM Policy Tracking**: Monitors Index Lifecycle Management policies and statistics
- **Index Template Management**: Collects information about index templates
- **Settings Monitoring**: Retrieves and tracks index settings
- **Task Scheduling**: Runs collection tasks every 24 hours via Task Manager

## Configuration

The plugin's configuration prefix is `xpack.indicesMetadata`

### Plugin Configuration Options

- `enabled`: Whether the plugin is enabled (default: `true`)
- `cdn.url` — URL for artifact downloads
- `cdn.publicKey` — Public key for artifact verification
- `cdn.requestTimeout` — Timeout for CDN requests

### Configuration Example

`kibana.yml`

```yaml
xpack.indicesMetadata:
  enabled: false
  cdn:
    url: 'https://artifacts.elastic.co'
    publicKey: '...'
    requestTimeout: 30000
```

## Dependencies

- **Required Plugins**: `taskManager`
- **Owner**: `@elastic/security-solution`

## Development

This plugin is server-side only and depends on:

- Task Manager for scheduled metadata collection
- Analytics service for telemetry
- Elasticsearch client for metadata retrieval

See the [Kibana contributing
guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for
instructions setting up your development environment.