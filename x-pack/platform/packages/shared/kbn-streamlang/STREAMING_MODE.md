# OTEL Config Generator - Dynamic Processor Injection

## Overview

The OTEL config generator creates **processor configurations only** for dynamic injection into statically-defined OTEL collector pipelines. This architecture separates infrastructure (static config) from business logic (dynamic processors).

## Architecture

### Static vs Dynamic Configuration

**Static Configuration (config.sampling.yaml)**
- Defines pipeline structure
- Defines connectors (routing/stream_ingress, routing/stream_egress)
- Defines receivers (otlp, filelog, etc.)
- Defines exporters (elasticsearch, debug, etc.)
- Version controlled and stable

**Dynamic Configuration (Elasticsearch)**
- Defines ONLY processor configurations
- Generated from stream definitions
- Can be updated without collector restart
- Polled by elasticpipelineextension

### Static Config Example

```yaml
connectors:
  routing/stream_ingress:
    default_pipelines: [logs/stream_processing]
    table:
      - statement: route()
        pipelines: [logs/stream_processing]
  
  routing/stream_egress:
    default_pipelines: [logs/sampling_decision]
    table:
      - statement: route()
        pipelines: [logs/sampling_decision]

pipelines:
  logs/intake:
    receivers: [otlp]
    processors: [rawcapture, resource, attributes]
    exporters: [routing/stream_ingress]
  
  logs/stream_processing:
    receivers: [routing/stream_ingress]
    processors: [transform/stream_processing]  # ← Dynamic processor from Elasticsearch
    exporters: [routing/stream_egress]
  
  logs/sampling_decision:
    receivers: [routing/stream_egress]
    processors: [transform, batch, samplingdecide]
    exporters: [routing/output_split]
```

### Dynamic Config Example (Elasticsearch Document)

```json
{
  "pipeline_id": "elastic-streams-pipeline",
  "agent": {
    "environment": "production",
    "cluster": "default",
    "labels": {
      "source": "elastic-streams"
    }
  },
  "config": {
    "processors": {
      "transform/stream_processing": {
        "error_mode": "propagate",
        "log_statements": [
          {
            "context": "log",
            "statements": [
              "set(attributes[\"stream.name\"], \"logs\")"
            ]
          },
          {
            "context": "log",
            "conditions": [
              "attributes[\"stream.name\"] == \"logs\""
            ],
            "statements": [
              "set(attributes[\"target_stream\"], \"logs\")",
              "set(attributes[\"otel_processed\"], true)"
            ]
          },
          {
            "context": "log",
            "conditions": [
              "attributes[\"stream.name\"] == \"logs\"",
              "attributes[\"service\"] == \"app\""
            ],
            "statements": [
              "set(attributes[\"stream.name\"], \"logs.app\")"
            ]
          },
          {
            "context": "log",
            "conditions": [
              "attributes[\"stream.name\"] == \"logs.app\""
            ],
            "statements": [
              "set(attributes[\"target_stream\"], \"logs.app\")",
              "set(attributes[\"otel_processed\"], true)"
            ]
          }
        ]
      }
    }
  },
  "metadata": {
    "created_at": "2025-11-10T18:57:43.288Z",
    "updated_at": "2025-11-10T18:57:43.288Z",
    "created_by": "system",
    "version": 1,
    "enabled": true,
    "priority": 100
  }
}
```

## Data Flow

```
┌─────────────┐
│  OTLP Input │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  logs/intake     │  Static pipeline
│  - rawcapture    │
│  - resource      │
│  - attributes    │
└──────┬───────────┘
       │
       v
┌────────────────────────┐
│ routing/stream_ingress │  Connector (defined in static config)
└──────┬─────────────────┘
       │
       v
┌───────────────────────────────────┐
│  logs/stream_processing           │  Static pipeline structure
│  - transform/stream_processing    │  ← Dynamic processor from Elasticsearch
└──────┬────────────────────────────┘
       │
       v
┌────────────────────────┐
│ routing/stream_egress  │  Connector (defined in static config)
└──────┬─────────────────┘
       │
       v
┌──────────────────────┐
│ logs/sampling_decision │  Static pipeline
│  - transform         │
│  - batch             │
│  - samplingdecide    │
└──────────────────────┘
```

## Processor Logic

The generated `transform/stream_processing` processor uses conditional OTTL statements to:

1. **Initialize stream.name** - Set to root stream unconditionally
2. **Parse JSON** - Optional JSON body parsing
3. **Process streams** - Execute processing steps when stream.name matches
4. **Add metadata** - Tag with target_stream and otel_processed
5. **Route to children** - Change stream.name based on routing conditions

### Breadth-First Processing

Streams are processed in breadth-first order to ensure parent streams are processed before children:

```
logs (root)
├── logs.app (child)
│   └── logs.app.errors (grandchild)
└── logs.db (child)

Processing order: logs → logs.app → logs.db → logs.app.errors
```

## API

### `convertToOtelConfig(streams, options)`

Generates processor configuration from stream definitions.

**Parameters:**
- `streams: Streams.WiredStream.Definition[]` - Array of stream definitions
- `options?: OTELConfigGeneratorOptions` - Configuration options
  - `includeJsonParsing?: boolean` - Add JSON parsing logic
  - `ignoreUnsupportedProcessors?: boolean` - Set error_mode to 'ignore'
  - `includeOnlyStreamsWithProcessing?: boolean` - Filter to streams with processing

**Returns:** `OTELConfig` - Processor configuration only

**Example:**
```typescript
import { convertToOtelConfig } from '@kbn/streamlang';

const config = convertToOtelConfig(wiredStreams, {
  includeJsonParsing: true,
  ignoreUnsupportedProcessors: false
});

// Returns:
// {
//   processors: {
//     "transform/stream_processing": {
//       error_mode: "propagate",
//       log_statements: [...]
//     }
//   }
// }
```

### `validateProcessorConfig(config)`

Validates generated processor configuration.

**Parameters:**
- `config: OTELConfig` - Generated configuration

**Returns:** `string[]` - Array of validation errors (empty if valid)

**Checks:**
- `transform/stream_processing` processor exists
- Processor has log_statements array

**Example:**
```typescript
import { convertToOtelConfig, validateProcessorConfig } from '@kbn/streamlang';

const config = convertToOtelConfig(streams);
const errors = validateProcessorConfig(config);

if (errors.length > 0) {
  console.error('Validation failed:', errors);
}
```

## Integration with elasticpipelineextension

### Extension Behavior

The `elasticpipelineextension` in the OTEL collector:

1. **Polls Elasticsearch** - Checks for config updates every `poll_interval` (default: 30s)
2. **Creates Processors** - Builds processor components from Elasticsearch config
3. **Registers Components** - Makes processors available to static pipelines
4. **Monitors Changes** - Recreates processors when version changes

### Extension Configuration

```yaml
extensions:
  elasticpipeline:
    source:
      elasticsearch:
        endpoint: http://localhost:9200
        username: elastic
        password: password
        index: .otel-pipeline-config
        cache_duration: 5m
    watcher:
      poll_interval: 30s
      cache_duration: 5m
    pipeline_management:
      namespace: elastic
      validate_configs: true
```

### Updating Processor Logic

To update stream processing logic:

1. Update stream definitions in Kibana
2. Kibana generates new processor config
3. Kibana stores config in Elasticsearch (increments version)
4. Extension polls Elasticsearch (within poll_interval)
5. Extension detects new version
6. Extension recreates processor
7. New logs use updated processor immediately

**No collector restart required!**

## Benefits

### 1. Clear Separation of Concerns
- **Infrastructure** (static): Pipelines, connectors, receivers, exporters
- **Business Logic** (dynamic): Stream processing, routing, transforms

### 2. Simplified Configuration
- No need to define full pipelines in Elasticsearch
- Only specify processor configurations
- Reduced chance of misconfigurations

### 3. Stable Infrastructure
- Pipeline structure is version controlled
- Connectors defined once
- Predictable data flow

### 4. Dynamic Business Logic
- Update stream processing without restarts
- Iterate quickly on transforms
- Safe rollbacks via versioning

### 5. Reduced Complexity
- Generator only creates processor configs
- No pipeline generation complexity
- Smaller Elasticsearch documents

## Migration from Previous Architecture

### Before (Complex)

Generated full pipeline configuration with connectors and pipelines.

### After (Simple)

Generates only processor configuration:

```typescript
// Old approach (generated pipelines + connectors + processors)
const config = convertToOtelConfig(streams, {
  streamingConfig: {
    streamIngressConnector: 'routing/stream_ingress',
    streamEgressConnector: 'routing/stream_egress',
    componentPrefix: 'stream_'
  }
});

// New approach (generates only processors)
const config = convertToOtelConfig(streams, {
  includeJsonParsing: true
});
```

The static config now handles all infrastructure:
- Pipelines defined in `config.sampling.yaml`
- Connectors defined in `config.sampling.yaml`
- Only processors come from Elasticsearch

## Example: Complete Integration

### Stream Definition
```typescript
const streams = [
  {
    name: 'logs',
    ingest: {
      processing: { steps: [] },
      wired: {
        routing: [
          { destination: 'logs.app', where: { field: 'service', operator: 'eq', value: 'app' } }
        ]
      }
    }
  },
  {
    name: 'logs.app',
    ingest: {
      processing: {
        steps: [{ grok: { field: 'message', patterns: ['%{WORD:action}'] } }]
      },
      wired: { routing: [] }
    }
  }
];
```

### Generated Processor Config
```json
{
  "processors": {
    "transform/stream_processing": {
      "error_mode": "propagate",
      "log_statements": [
        {
          "context": "log",
          "statements": ["set(attributes[\"stream.name\"], \"logs\")"]
        },
        {
          "context": "log",
          "conditions": ["attributes[\"stream.name\"] == \"logs\""],
          "statements": [
            "set(attributes[\"target_stream\"], \"logs\")",
            "set(attributes[\"otel_processed\"], true)"
          ]
        },
        {
          "context": "log",
          "conditions": [
            "attributes[\"stream.name\"] == \"logs\"",
            "attributes[\"service\"] == \"app\""
          ],
          "statements": ["set(attributes[\"stream.name\"], \"logs.app\")"]
        },
        {
          "context": "log",
          "conditions": ["attributes[\"stream.name\"] == \"logs.app\""],
          "statements": [
            "set(cache[\"grok_0\"], ExtractGrokPatterns(body, \"%{WORD:action}\", false))",
            "merge_maps(attributes, cache[\"grok_0\"], \"upsert\")"
          ]
        },
        {
          "context": "log",
          "conditions": ["attributes[\"stream.name\"] == \"logs.app\""],
          "statements": [
            "set(attributes[\"target_stream\"], \"logs.app\")",
            "set(attributes[\"otel_processed\"], true)"
          ]
        }
      ]
    }
  }
}
```

### Static Pipeline Config (Already Deployed)
```yaml
pipelines:
  logs/stream_processing:
    receivers: [routing/stream_ingress]
    processors: [transform/stream_processing]  # References dynamic processor
    exporters: [routing/stream_egress]
```

The static pipeline references `transform/stream_processing` by name, and the extension ensures this processor is available with the configuration from Elasticsearch.
