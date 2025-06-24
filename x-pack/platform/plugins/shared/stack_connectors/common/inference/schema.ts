/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const TelemtryMetadataSchema = schema.object({
  pluginId: schema.maybe(schema.string()),
  aggregateBy: schema.maybe(schema.string()),
});

export const ConfigSchema = schema.object({
  provider: schema.string(),
  taskType: schema.string(),
  inferenceId: schema.string(),
  providerConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
  taskTypeConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const SecretsSchema = schema.object({
  providerSecrets: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const ChatCompleteParamsSchema = schema.object({
  input: schema.string(),
});

// subset of OpenAI.ChatCompletionMessageParam https://github.com/openai/openai-node/blob/master/src/resources/chat/completions.ts
const AIMessage = schema.object({
  role: schema.string(),
  content: schema.maybe(schema.nullable(schema.string())),
  name: schema.maybe(schema.string()),
  tool_calls: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        function: schema.object({
          arguments: schema.maybe(schema.string()),
          name: schema.maybe(schema.string()),
        }),
        type: schema.string(),
      })
    )
  ),
  tool_call_id: schema.maybe(schema.string()),
});

const AITool = schema.object({
  type: schema.string(),
  function: schema.object({
    name: schema.string(),
    description: schema.maybe(schema.string()),
    parameters: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }),
});

// subset of OpenAI.ChatCompletionCreateParamsBase https://github.com/openai/openai-node/blob/master/src/resources/chat/completions.ts
export const UnifiedChatCompleteParamsSchema = schema.object({
  body: schema.object({
    messages: schema.arrayOf(AIMessage, { defaultValue: [] }),
    model: schema.maybe(schema.string()),
    /**
     * The maximum number of [tokens](/tokenizer) that can be generated in the chat
     * completion. This value can be used to control
     * [costs](https://openai.com/api/pricing/) for text generated via API.
     *
     * This value is now deprecated in favor of `max_completion_tokens`, and is not
     * compatible with
     * [o1 series models](https://platform.openai.com/docs/guides/reasoning).
     */
    max_tokens: schema.maybe(schema.number()),
    /**
     * Developer-defined tags and values used for filtering completions in the
     * [dashboard](https://platform.openai.com/chat-completions).
     */
    metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    /**
     * How many chat completion choices to generate for each input message. Note that
     * you will be charged based on the number of generated tokens across all of the
     * choices. Keep `n` as `1` to minimize costs.
     */
    n: schema.maybe(schema.number()),
    /**
     * Up to 4 sequences where the API will stop generating further tokens.
     */
    stop: schema.maybe(
      schema.nullable(schema.oneOf([schema.string(), schema.arrayOf(schema.string())]))
    ),
    /**
     * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
     * make the output more random, while lower values like 0.2 will make it more
     * focused and deterministic.
     *
     * We generally recommend altering this or `top_p` but not both.
     */
    temperature: schema.maybe(schema.number()),
    /**
     * Controls which (if any) tool is called by the model. `none` means the model will
     * not call any tool and instead generates a message. `auto` means the model can
     * pick between generating a message or calling one or more tools. `required` means
     * the model must call one or more tools. Specifying a particular tool via
     * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
     * call that tool.
     *
     * `none` is the default when no tools are present. `auto` is the default if tools
     * are present.
     */
    tool_choice: schema.maybe(
      schema.oneOf([
        schema.string(),
        schema.object({
          type: schema.string(),
          function: schema.object({
            name: schema.string(),
          }),
        }),
      ])
    ),
    /**
     * A list of tools the model may call. Currently, only functions are supported as a
     * tool. Use this to provide a list of functions the model may generate JSON inputs
     * for. A max of 128 functions are supported.
     */
    tools: schema.maybe(schema.arrayOf(AITool)),
    /**
     * An alternative to sampling with temperature, called nucleus sampling, where the
     * model considers the results of the tokens with top_p probability mass. So 0.1
     * means only the tokens comprising the top 10% probability mass are considered.
     *
     * We generally recommend altering this or `temperature` but not both.
     */
    top_p: schema.maybe(schema.number()),
    /**
     * A unique identifier representing your end-user, which can help OpenAI to monitor
     * and detect abuse.
     * [Learn more](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids).
     */
    user: schema.maybe(schema.string()),
  }),
  // abort signal from client
  signal: schema.maybe(schema.any()),
  telemetryMetadata: schema.maybe(TelemtryMetadataSchema),
});

export const UnifiedChatCompleteResponseSchema = schema.object({
  id: schema.string(),
  choices: schema.arrayOf(
    schema.object({
      finish_reason: schema.maybe(
        schema.nullable(
          schema.oneOf([
            schema.literal('stop'),
            schema.literal('length'),
            schema.literal('tool_calls'),
            schema.literal('content_filter'),
            schema.literal('function_call'),
          ])
        )
      ),
      index: schema.maybe(schema.number()),
      message: schema.object({
        content: schema.maybe(schema.nullable(schema.string())),
        refusal: schema.maybe(schema.nullable(schema.string())),
        role: schema.maybe(schema.string()),
        tool_calls: schema.maybe(
          schema.arrayOf(
            schema.object({
              id: schema.maybe(schema.string()),
              index: schema.maybe(schema.number()),
              function: schema.maybe(
                schema.object({
                  arguments: schema.maybe(schema.string()),
                  name: schema.maybe(schema.string()),
                })
              ),
              type: schema.maybe(schema.string()),
            }),
            { defaultValue: [] }
          )
        ),
      }),
    }),
    { defaultValue: [] }
  ),
  created: schema.maybe(schema.number()),
  model: schema.maybe(schema.string()),
  object: schema.maybe(schema.string()),
  usage: schema.maybe(
    schema.nullable(
      schema.object({
        completion_tokens: schema.maybe(schema.number()),
        prompt_tokens: schema.maybe(schema.number()),
        total_tokens: schema.maybe(schema.number()),
      })
    )
  ),
});

export const ChatCompleteResponseSchema = schema.arrayOf(
  schema.object({
    result: schema.string(),
  }),
  { defaultValue: [] }
);

export const RerankParamsSchema = schema.object({
  input: schema.arrayOf(schema.string(), { defaultValue: [] }),
  query: schema.string(),
});

export const RerankResponseSchema = schema.arrayOf(
  schema.object({
    text: schema.maybe(schema.string()),
    index: schema.number(),
    score: schema.number(),
  }),
  { defaultValue: [] }
);

export const SparseEmbeddingParamsSchema = schema.object({
  input: schema.string(),
});

export const SparseEmbeddingResponseSchema = schema.arrayOf(
  schema.object({}, { unknowns: 'allow' }),
  { defaultValue: [] }
);

export const TextEmbeddingParamsSchema = schema.object({
  input: schema.string(),
  inputType: schema.string(),
});

export const TextEmbeddingResponseSchema = schema.arrayOf(
  schema.object({
    embedding: schema.arrayOf(schema.any(), { defaultValue: [] }),
  }),
  { defaultValue: [] }
);

export const StreamingResponseSchema = schema.stream();

// Run action schema
export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
