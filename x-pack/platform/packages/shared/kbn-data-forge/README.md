# @kbn/data-forge

Synthetic data generation library for testing and development in Kibana. This package provides tools for creating realistic datasets including logs, metrics, and other observability data for testing purposes.

## Overview

The `@kbn/data-forge` package is a comprehensive data generation toolkit designed for creating synthetic datasets that mimic real-world observability data. It's primarily used for testing, performance benchmarking, and development workflows where realistic data is needed.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/obs-ux-management-team`
- **Visibility**: Shared across platform
- **Dependencies**: `moment`, `@elastic/elasticsearch`, `io-ts`

## Core Components

### Data Generation Functions
- `generate()` - Main data generation function
- `run()` - Execute data generation with configuration
- `cleanup()` - Clean up generated test data

### Configuration Management
- `createConfig()` - Create generation configuration
- `readConfig()` - Read configuration from files
- `DEFAULTS` - Default configuration constants

### CLI Interface
- `cli()` - Command-line interface for data generation

## Supported Dataset Types

### FAKE_HOSTS
Generates synthetic host metrics and system data:
- CPU, memory, disk usage metrics
- Network statistics
- System information

### FAKE_LOGS
Creates realistic log entries:
- Application logs with various severity levels
- Structured logging formats
- Timestamp sequences

### FAKE_STACK
Generates Elastic Stack-related data:
- Elasticsearch metrics
- Kibana usage patterns
- Stack component interactions

### SERVICE_LOGS
Service-oriented logging data:
- Microservice communication logs
- API request/response patterns
- Service health indicators

## Usage Examples

### Basic Data Generation
```typescript
import { generate, createConfig } from '@kbn/data-forge';

const config = createConfig({
  dataset: 'fake_logs',
  scenario: 'normal',
  range: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-02T00:00:00Z'
  }
});

await generate(config);
```

### CLI Usage
```typescript
import { cli } from '@kbn/data-forge';

// Command line interface
await cli({
  dataset: 'fake_hosts',
  count: 10000,
  interval: '1m'
});
```

### Custom Configuration
```typescript
import { run, DEFAULTS } from '@kbn/data-forge';

const customConfig = {
  ...DEFAULTS,
  esClient: myElasticsearchClient,
  indexTemplate: 'logs-synthetic-*',
  eventsPerCycle: 100,
  schedule: {
    duration: '1h',
    interval: '30s'
  }
};

await run(customConfig);
```

### Data Cleanup
```typescript
import { cleanup } from '@kbn/data-forge';

// Clean up generated test data
await cleanup({
  esClient: client,
  indexPattern: 'synthetic-*',
  olderThan: '7d'
});
```

## Configuration Types

### Config Interface
```typescript
interface Config {
  dataset: Dataset;
  scenario: string;
  schedule: Schedule;
  elasticsearch: {
    host: string;
    auth?: AuthConfig;
  };
  eventsPerCycle: EventsPerCycle;
  transitionMethod: TransitionMethod;
}
```

### Dataset Options
- `fake_hosts` - System and infrastructure metrics
- `fake_logs` - Application and system logs  
- `fake_stack` - Elastic Stack metrics
- `service_logs` - Service-oriented logging

## Integration with Kibana

### Testing Integration
Used extensively for:
- Performance testing with realistic data volumes
- Feature testing with varied data patterns
- Integration testing across different data types

### Development Workflows
- Local development with synthetic data
- Demo environments with realistic datasets
- Load testing and capacity planning

### Observability Testing
- Testing dashboards with synthetic metrics
- Validating alerting rules with generated data
- Performance testing of data ingestion pipelines

The package provides a foundation for consistent, reproducible test data generation across all Kibana observability features, enabling effective testing and development workflows without requiring production data.
