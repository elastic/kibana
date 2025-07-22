# @kbn/langgraph-checkpoint-saver

Contains a LangGraph checkpoint saver backed by a Elasticsearch database.

The package does not expose `index.ts` at its root, instead there's a `server` directory you should deep-import from.



### Development

#### How to run tests

```bash
node scripts/jest_integration 'x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver'
```