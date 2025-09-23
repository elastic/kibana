# @kbn/streams-ai-cli

Command line tool used to run stream related workflows.

## AI suggested partitioning

Ingests Loghub sample data and generates partition suggestions:

```
node --require ./src/setup_node_env/ ./x-pack/platform/packages/shared/kbn-streams-ai-cli/recipes/partition_stream.ts
```
