# @kbn/streams-ai

## Task description

The task description in `x-pack/platform/packages/shared/kbn-streams-ai/workflows/partition_stream/task_description.text` can be used to generate the prompt

```bash
node --require ./src/setup_node_env x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_meta_prompt.ts --input "$(cat x-pack/platform/packages/shared/kbn-streams-ai/src/significant_events/task_description.text)" | pbcopy
```
