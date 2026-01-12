# Storage Adapter Checkpoint Saver

A LangGraph checkpoint saver implementation that uses Elasticsearch for persistent storage, integrated with Kibana's Storage Index Adapter pattern for automatic index management.

## Overview

The `storage-adapter-checkpoint-saver` package provides a checkpoint saver for LangGraph that:
- Stores checkpoints and checkpoint writes in Elasticsearch indices
- Automatically creates and manages indices using the Storage Index Adapter pattern
- Supports scoped Elasticsearch clients for security context handling
- Provides both direct client creation and service-based patterns

## Installation

```ts
import {
  createCheckpointerClient,
  CheckpointerServiceImpl,
  type CheckpointerService,
} from '@kbn/langgraph-checkpoint-saver/server';
```

## Usage

### Option 1: Direct Client Creation

Use `createCheckpointerClient` when you have direct access to an Elasticsearch client and logger:

```ts
import { createCheckpointerClient } from '@kbn/langgraph-checkpoint-saver/server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';

// Create a checkpointer client
const checkpointer = createCheckpointerClient({
  indexPrefix: '.chat-', // Creates indices: .chat-checkpoints, .chat-checkpoint-writes
  logger: core.logger.get('checkpointer'),
  esClient: elasticsearch.client.asInternalUser,
});

// Use with LangGraph
const graph = new StateGraph({...})
  .compile({
    checkpointer,
  });
```

### Option 2: Service Pattern (Recommended for Plugins)

Use `CheckpointerServiceImpl` when you need request-scoped checkpointers that respect the user's security context:

```ts
import { CheckpointerServiceImpl } from '@kbn/langgraph-checkpoint-saver/server';
import type { CheckpointerService } from '@kbn/langgraph-checkpoint-saver/server';

// In plugin setup
export class MyPlugin {
  private checkpointerService?: CheckpointerService;

  setup(core: CoreSetup) {
    // Service is created but not initialized yet
  }

  start(core: CoreStart) {
    // Initialize the service
    this.checkpointerService = new CheckpointerServiceImpl({
      indexPrefix: '.chat-',
      logger: core.logger.get('checkpointer'),
      elasticsearch: core.elasticsearch,
    });

    return {
      getCheckpointerService: () => this.checkpointerService!,
    };
  }
}

// In route handler
router.post(
  { path: '/api/my-route', validate: false },
  async (context, request, response) => {
    // Get a scoped checkpointer for this request
    const checkpointer = await checkpointerService.getCheckpointer({ request });

    // Use with LangGraph
    const graph = new StateGraph({...})
      .compile({
        checkpointer,
      });

    // ... rest of handler
  }
);
```

## Index Naming

The package creates two indices based on the provided prefix:

- **Checkpoints Index**: `{prefix}checkpoints`
  - Example: `.chat-checkpoints` (with prefix `.chat-`)
  - Stores checkpoint snapshots

- **Checkpoint Writes Index**: `{prefix}checkpoint-writes`
  - Example: `.chat-checkpoint-writes` (with prefix `.chat-`)
  - Stores checkpoint write operations

### Index Prefix Guidelines

- Use dot-prefixed names for system indices (e.g., `.chat-`, `.observability-`, `.security-`)
- Choose a prefix that matches your solution or plugin name
- Ensure the prefix is unique to avoid conflicts

## Index Schema

### Checkpoints Index Schema

```ts
{
  '@timestamp': Date,
  thread_id: string,
  checkpoint_ns: string,
  checkpoint_id: string,
  parent_checkpoint_id: string,
  type: string,
  checkpoint: Binary, // Serialized checkpoint data
  metadata: Binary,   // Serialized metadata
}
```

### Checkpoint Writes Index Schema

```ts
{
  '@timestamp': Date,
  thread_id: string,
  checkpoint_ns: string,
  checkpoint_id: string,
  task_id: string,
  idx: number,
  channel: string,
  type: string,
  value: Binary, // Serialized write value
}
```

## Automatic Index Management

The package uses Kibana's Storage Index Adapter pattern, which means:

- **Indices are created automatically** on first write
- **Index templates are managed** by the storage adapter
- **Mappings are applied** according to the defined schema
- **No manual index setup required**

## Integration with LangGraph

The returned `ElasticSearchSaver` instance implements LangGraph's `BaseCheckpointSaver` interface and can be used directly with LangGraph:

```ts
import { StateGraph } from '@langchain/langgraph';

const graph = new StateGraph({
  channels: {
    // Your state channels
  },
})
  .addNode('node1', node1Function)
  .addNode('node2', node2Function)
  .addEdge('node1', 'node2')
  .compile({
    checkpointer, // Use the checkpointer here
  });

// Invoke with thread_id for checkpoint persistence
const result = await graph.invoke(
  { /* initial state */ },
  { configurable: { thread_id: 'my-thread-id' } }
);
```

## API Reference

### `createCheckpointerClient(options)`

Creates a checkpointer client instance.

**Parameters:**
- `options.indexPrefix` (string): Index name prefix (e.g., `.chat-`)
- `options.logger` (Logger): Kibana logger instance
- `options.esClient` (ElasticsearchClient): Elasticsearch client

**Returns:** `ElasticSearchSaver` instance

### `CheckpointerServiceImpl`

Service class for managing request-scoped checkpointers.

**Constructor Options:**
- `options.indexPrefix` (string): Index name prefix
- `options.logger` (Logger): Kibana logger instance
- `options.elasticsearch` (ElasticsearchServiceStart): Elasticsearch service

**Methods:**
- `getCheckpointer({ request })`: Returns a scoped checkpointer for the given request

## Examples

### Basic Usage in a Plugin

```ts
// plugin.ts
import { CheckpointerServiceImpl } from '@kbn/langgraph-checkpoint-saver/server';

export class MyPlugin implements Plugin {
  private checkpointerService?: CheckpointerService;

  start(core: CoreStart) {
    this.checkpointerService = new CheckpointerServiceImpl({
      indexPrefix: '.my-plugin-',
      logger: core.logger.get('my-plugin'),
      elasticsearch: core.elasticsearch,
    });

    return {
      checkpointerService: this.checkpointerService,
    };
  }
}

// routes.ts
router.post(
  { path: '/api/my-action', validate: false },
  async (context, request, response) => {
    const checkpointer = await checkpointerService.getCheckpointer({ request });
    
    const graph = createMyGraph(checkpointer);
    const result = await graph.invoke(
      { input: request.body.input },
      { configurable: { thread_id: request.body.threadId } }
    );

    return response.ok({ body: result });
  }
);
```

### Direct Client Usage

```ts
import { createCheckpointerClient } from '@kbn/langgraph-checkpoint-saver/server';

// In a service or utility function
function createMyGraph(esClient: ElasticsearchClient, logger: Logger) {
  const checkpointer = createCheckpointerClient({
    indexPrefix: '.my-service-',
    logger,
    esClient,
  });

  return new StateGraph({...})
    .compile({ checkpointer });
}
```

## Notes

- The checkpointer uses `wait_for` refresh policy by default for consistency
- Checkpoints are stored as binary data (serialized)
- Thread IDs are used to scope checkpoints to specific conversation threads
- The service pattern automatically handles security context scoping for multi-tenancy

