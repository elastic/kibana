# @kbn/inference-prompt-utils

Utility functions for executing prompts, such as prompt flows - e.g. `executeAsReasoningAgent` which will answer input using the tools, system message and template defined in the prompt.

## Generating a meta prompt

You can generate a meta prompt for specific prompt flows by calling the following script:

`node --require ./src/setup_node_env/index x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_meta_prompt.ts --input $MY_INPUT`

it will then generate a meta prompt that you can feed to an LLM to generate a system prompt + user message template. As an example, see the [ES|QL reference implementation](../kbn-ai-tools//src/tools//esql). Here's how you can use it:

`node --require ./src/setup_node_env x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_meta_prompt.ts --input "$(cat x-pack/platform/packages/shared/kbn-ai-tools/src/tools/esql/esql_task_description.text)"`
