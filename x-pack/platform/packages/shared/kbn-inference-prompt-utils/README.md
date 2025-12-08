# @kbn/inference-prompt-utils

Utility functions for executing prompts, such as prompt flows - e.g. `executeAsReasoningAgent` which will answer input using the tools, system message and template defined in the prompt.

## Generating a system prompt

You can generate a system prompt for specific prompt flows by calling a script:

`node --require ./src/setup_node_env/index x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_reasoning_system_prompt.ts --input $MY_INPUT`

it will then generate a templated system prompt that you can use at runtime. As an example, see the [ES|QL reference implementation](../kbn-ai-tools//src/tools/esql). Here's how you can use it:

`node --require ./src/setup_node_env x-pack/platform/packages/shared/kbn-inference-prompt-utils/scripts/generate_reasoning_system_prompt.ts --input "$(cat x-pack/platform/packages/shared/kbn-ai-tools/src/tools/esql/esql_task_description.text)"`

You can specify a connector by passing in `--connectorId`. If `--connectorId` is not set, you will be prompted to select a connector.
