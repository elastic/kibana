# @kbn/langgraph-checkpoint-saver

Contains a LangGraph checkpoint saver backed by a Elasticsearch database.

The package does not expose `index.ts` at its root, instead there's a `server` directory you should deep-import from.

## Usage

The ElasticSearchSaver does not setup/manage indices itself. While you need to set those up yourself outside of this package, the ElasticSearchSaver provides the mappings that should be used for the indices through `ElasticSearchSaver.checkpointIndexMapping` and `ElasticSearchSaver.checkpointWritesIndexMapping`. Make sure to write an integration test in your code that ensures your indices are setup and work with this checkpoint saver (see example int test [here](server/elastic-search-checkpoint-saver/integration_tests/elastic_search_checkpoint_saver.test.ts)).

```ts
import { Client } from '@elastic/elasticsearch';
import { ElasticSearchSaver } from "@kbn/langgraph-checkpoint-saver";

const writeConfig = {
  configurable: {
    thread_id: "1",
    checkpoint_ns: ""
  }
};
const readConfig = {
  configurable: {
    thread_id: "1"
  }
};


const client = new Client({ node: process.env.ELASTICSEARCH_URL });

// Setup indices
await client.indices.create({
    index: ElasticSearchSaver.defaultCheckpointIndex,
    mappings: {
        properties: ElasticSearchSaver.checkpointIndexMapping,
    },
});

await client.indices.create({
    index: ElasticSearchSaver.defaultCheckpointWritesIndex,
    mappings: {
        properties: ElasticSearchSaver.checkpointWritesIndexMapping,
    },
});

const checkpointer = new ElasticSearchSaver({ client });

const checkpoint = {
  v: 1,
  ts: "2025-07-23T17:42:34.754Z",
  id: "1ef4f797-8335-6428-8001-8a1503f9b875",
  channel_values: {
    my_key: "meow",
    node: "node"
  },
  channel_versions: {
    __start__: 2,
    my_key: 3,
    "start:node": 3,
    node: 3
  },
  versions_seen: {
    __input__: {},
    __start__: {
      __start__: 1
    },
    node: {
      "start:node": 2
    }
  },
  pending_sends: [],
}

// store checkpoint
await checkpointer.put(writeConfig, checkpoint, {}, {});

// load checkpoint
await checkpointer.get(readConfig);

// list checkpoints
for await (const checkpoint of checkpointer.list(readConfig)) {
  console.log(checkpoint);
}

await client.close();
```

### Development

#### How to run tests

```bash
node scripts/jest_integration 'x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver'
```