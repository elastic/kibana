/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
export const TelemetryMetadataSchema = z
  .object({
    pluginId: z.string().optional(),
    aggregateBy: z.string().optional(),
  })
  .strict();

export const ConfigSchema = z
  .object({
    provider: z.string(),
    taskType: z.string(),
    inferenceId: z.string(),
    providerConfig: z.object({}).passthrough().default({}),
    taskTypeConfig: z.object({}).passthrough().default({}),
    contextWindowLength: z.coerce.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    temperature: z.coerce.number().optional(),
  })
  .strict();

export const SecretsSchema = z
  .object({
    providerSecrets: z.object({}).passthrough().default({}),
  })
  .strict();

export const ChatCompleteParamsSchema = z
  .object({
    input: z.string(),
  })
  .strict();

// subset of OpenAI.ChatCompletionMessageParam https://github.com/openai/openai-node/blob/master/src/resources/chat/completions.ts
const AIMessage = z
  .object({
    role: z.string(),
    content: z.string().nullish(),
    name: z.string().optional(),
    tool_calls: z
      .array(
        z
          .object({
            id: z.string(),
            function: z
              .object({
                arguments: z.string().optional(),
                name: z.string().optional(),
              })
              .strict(),
            type: z.string(),
          })
          .strict()
      )
      .optional(),
    tool_call_id: z.string().optional(),
  })
  .strict();

const AITool = z
  .object({
    type: z.string(),
    function: z
      .object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.string(), z.any()).optional(),
      })
      .strict(),
  })
  .strict();

// subset of OpenAI.ChatCompletionCreateParamsBase https://github.com/openai/openai-node/blob/master/src/resources/chat/completions.ts
export const UnifiedChatCompleteParamsSchema = z
  .object({
    body: z
      .object({
        messages: z.array(AIMessage).default([]),
        model: z.string().optional(),
        /**
         * The maximum number of [tokens](/tokenizer) that can be generated in the chat
         * completion. This value can be used to control
         * [costs](https://openai.com/api/pricing/) for text generated via API.
         *
         * This value is now deprecated in favor of `max_completion_tokens`, and is not
         * compatible with
         * [o1 series models](https://platform.openai.com/docs/guides/reasoning).
         */
        max_tokens: z.coerce.number().optional(),
        /**
         * Developer-defined tags and values used for filtering completions in the
         * [dashboard](https://platform.openai.com/chat-completions).
         */
        metadata: z.record(z.string(), z.string()).optional(),
        /**
         * How many chat completion choices to generate for each input message. Note that
         * you will be charged based on the number of generated tokens across all of the
         * choices. Keep `n` as `1` to minimize costs.
         */
        n: z.coerce.number().optional(),
        /**
         * Up to 4 sequences where the API will stop generating further tokens.
         */
        stop: z.union([z.string(), z.array(z.string())]).nullish(),
        /**
     * The maximum number of tokens to generate in the completion. Requests can use
     z.union([z.string(), z.array(z.string)]).optional(),
    /**
     * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
     * make the output more random, while lower values like 0.2 will make it more
     * focused and deterministic.
     *
     * We generally recommend altering this or `top_p` but not both.
     */
        temperature: z.coerce.number().optional(),
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
        tool_choice: z
          .union([
            z.string(),
            z
              .object({
                type: z.string(),
                function: z
                  .object({
                    name: z.string(),
                  })
                  .strict(),
              })
              .strict(),
          ])
          .optional(),
        /**
         * A list of tools the model may call. Currently, only functions are supported as a
         * tool. Use this to provide a list of functions the model may generate JSON inputs
         * for. A max of 128 functions are supported.
         */
        tools: z.array(AITool).optional(),
        /**
         * An alternative to sampling with temperature, called nucleus sampling, where the
         * model considers the results of the tokens with top_p probability mass. So 0.1
         * means only the tokens comprising the top 10% probability mass are considered.
         *
         * We generally recommend altering this or `temperature` but not both.
         */
        top_p: z.coerce.number().optional(),
        /**
         * A unique identifier representing your end-user, which can help OpenAI to monitor
         * and detect abuse.
         * [Learn more](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids).
         */
        user: z.string().optional(),
      })
      .strict(),
    // abort signal from client
    signal: z.any().optional(),
    telemetryMetadata: TelemetryMetadataSchema.optional(),
  })
  .strict();

export const UnifiedChatCompleteResponseSchema = z
  .object({
    id: z.string(),
    choices: z
      .array(
        z
          .object({
            finish_reason: z
              .enum(['stop', 'length', 'tool_calls', 'content_filter', 'function_call'])
              .nullish(),
            index: z.coerce.number().optional(),
            message: z
              .object({
                content: z.string().nullish(),
                refusal: z.string().nullish(),
                role: z.string().optional(),
                tool_calls: z
                  .array(
                    z
                      .object({
                        id: z.string().optional(),
                        index: z.coerce.number().optional(),
                        function: z
                          .object({
                            arguments: z.string().optional(),
                            name: z.string().optional(),
                          })
                          .strict()
                          .optional(),
                        type: z.string().optional(),
                      })
                      .strict()
                  )
                  .default([])
                  .optional(),
              })
              .strict(),
          })
          .strict()
      )
      .default([]),
    created: z.coerce.number().optional(),
    model: z.string().optional(),
    object: z.string().optional(),
    usage: z
      .object({
        completion_tokens: z.coerce.number().optional(),
        prompt_tokens: z.coerce.number().optional(),
        total_tokens: z.coerce.number().optional(),
      })
      .strict()
      .nullish(),
  })
  .strict();

export const ChatCompleteResponseSchema = z
  .array(
    z
      .object({
        result: z.string(),
      })
      .strict()
  )
  .default([]);

export const RerankParamsSchema = z
  .object({
    input: z.array(z.string()).default([]),
    query: z.string(),
  })
  .strict();

export const RerankResponseSchema = z
  .array(
    z
      .object({
        text: z.string().optional(),
        index: z.coerce.number(),
        score: z.coerce.number(),
      })
      .strict()
  )
  .default([]);

export const SparseEmbeddingParamsSchema = z
  .object({
    input: z.string(),
  })
  .strict();

export const SparseEmbeddingResponseSchema = z.array(z.object({}).passthrough()).default([]);

export const TextEmbeddingParamsSchema = z
  .object({
    input: z.string(),
    inputType: z.string(),
  })
  .strict();

export const TextEmbeddingResponseSchema = z
  .array(
    z
      .object({
        embedding: z.array(z.any()).default([]),
      })
      .strict()
  )
  .default([]);

export const StreamingResponseSchema = z.any();

// Run action schema
export const DashboardActionParamsSchema = z
  .object({
    dashboardId: z.string(),
  })
  .strict();

export const DashboardActionResponseSchema = z
  .object({
    available: z.boolean(),
  })
  .strict();
