# OTel Telemetry Collection Plugin

Plugin for collecting per-service OpenTelemetry resource attributes from
Elasticsearch and shipping them via Event-Based Telemetry (EBT). It sends
1 event per signal type (traces, metrics, logs) with no cross-signal
merging in Kibana.

## Overview

The OTel Telemetry Collection plugin is owned by the Observability BI team and provides:

1. **Per-service metadata collection** — Runs scheduled tasks to gather OTel
   resource attributes per service+environment pair
2. **Per-signal events** — Sends one EBT event per signal type (traces, metrics, logs)
3. **Dynamic configuration** — Query parameters and batching thresholds are configurable via CDN

## Features

- **SDK/Distro Tracking**: Collects SDK name, language, version, distro name/version
- **Infrastructure Context**: Cloud provider/platform/region/AZ, host architecture
- **OS & Runtime Info**: OS type/name/version, runtime name/version, executable name
- **Instrumentation Scopes**: Library/scope names (e.g. `io.opentelemetry.grpc-1.6`)
- **Orchestration Detection**: K8s and container presence (boolean flags)
- **Task Scheduling**: Runs collection tasks once per day via Task Manager

## Configuration

The plugin's configuration prefix is `xpack.otelTelemetryCollection`

### Plugin Configuration Options

- `enabled`: Whether the plugin is enabled (default: `true`)
- `cdn.url` — URL for artifact downloads
- `cdn.publicKey` — Public key for artifact verification
- `cdn.requestTimeout` — Timeout for CDN requests

### Configuration Example

`kibana.yml`

```yaml
xpack.otelTelemetryCollection:
  enabled: false
  cdn:
    url: 'https://artifacts.security.elastic.co'
    publicKey: '...'
    requestTimeout: 10000
```

## Dependencies

- **Required Plugins**: `taskManager`
- **Optional Plugins**: `telemetry`
- **Owner**: `@elastic/observability-bi`

## Development

This plugin is server-side only and depends on:

- Task Manager for scheduled metadata collection
- Analytics service for EBT event shipping
- Elasticsearch client for OTel index queries

See the [Kibana contributing
guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for
instructions setting up your development environment.
