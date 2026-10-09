# @kbn/streams-ai

## Task description

Each multi-turn agent keeps the meta-prompt source it was generated from in a
`task_description.text` next to its `prompt.ts`:

- `workflows/partition_stream/task_description.text`
- `src/significant_events/task_description.text`

Any of them can be fed to the meta-prompt generator to regenerate the corresponding system
prompt:

```bash
node --require ./src/setup_node_env x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_meta_prompt.ts --input "$(cat x-pack/platform/packages/shared/kbn-streams-ai/src/significant_events/task_description.text)" | pbcopy
```
