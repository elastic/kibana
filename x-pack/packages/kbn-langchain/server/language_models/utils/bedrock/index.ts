/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

// origin: https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-community/src/utils/bedrock/index.ts
// // Error: Package subpath './dist/utils/bedrock' is not defined by "exports" in langchain/community/package.json

import type { AwsCredentialIdentity, Provider } from '@aws-sdk/types';
import { AIMessage, AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import { ChatGeneration, ChatGenerationChunk } from '@langchain/core/outputs';
import { Logger } from '@kbn/logging';
import { extractToolCalls, formatMessagesForAnthropic } from './anthropic';

export type CredentialType = AwsCredentialIdentity | Provider<AwsCredentialIdentity>;

/**
 * format messages for Cohere Command-R and CommandR+ via AWS Bedrock.
 *
 * @param messages messages The base messages to format as a prompt.
 *
 * @returns The formatted prompt for Cohere.
 *
 * `system`: user system prompts. Overrides the default preamble for search query generation. Has no effect on tool use generations.\
 * `message`: (Required) Text input for the model to respond to.\
 * `chatHistory`: A list of previous messages between the user and the model, meant to give the model conversational context for responding to the user's message.\
 * The following are required fields.
 * - `role` - The role for the message. Valid values are USER or CHATBOT.\
 * - `message` – Text contents of the message.\
 *
 * The following is example JSON for the chat_history field.\
 * "chat_history": [
 * {"role": "USER", "message": "Who discovered gravity?"},
 * {"role": "CHATBOT", "message": "The man who is widely credited with discovering gravity is Sir Isaac Newton"}]\
 *
 * docs: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-command-r-plus.html
 */
function formatMessagesForCohere(messages: BaseMessage[]): {
  system?: string;
  message: string;
  chatHistory: Array<Record<string, unknown>>;
} {
  const systemMessages = messages.filter((system) => system._getType() === 'system');

  const system = systemMessages
    .filter((m) => typeof m.content === 'string')
    .map((m) => m.content)
    .join('\n\n');

  const conversationMessages = messages.filter((message) => message._getType() !== 'system');

  const questionContent = conversationMessages.slice(-1);

  if (!questionContent.length || questionContent[0]._getType() !== 'human') {
    throw new Error('question message content must be a human message.');
  }

  if (typeof questionContent[0].content !== 'string') {
    throw new Error('question message content must be a string.');
  }

  const formattedMessage = questionContent[0].content;

  const formattedChatHistories = conversationMessages.slice(0, -1).map((message) => {
    let role;
    switch (message._getType()) {
      case 'human':
        role = 'USER' as const;
        break;
      case 'ai':
        role = 'CHATBOT' as const;
        break;
      case 'system':
        throw new Error('chat_history can not include system prompts.');
      default:
        throw new Error(`Message type "${message._getType()}" is not supported.`);
    }

    if (typeof message.content !== 'string') {
      throw new Error('message content must be a string.');
    }
    return {
      role,
      message: message.content,
    };
  });

  return {
    chatHistory: formattedChatHistories,
    message: formattedMessage,
    system,
  };
}

/** Bedrock models.
    To authenticate, the AWS client uses the following methods to automatically load credentials:
    https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html
    If a specific credential profile should be used, you must pass the name of the profile from the ~/.aws/credentials file that is to be used.
    Make sure the credentials / roles used have the required policies to access the Bedrock service.
*/
export interface BaseBedrockInput {
  /** Model to use.
      For example, "amazon.titan-tg1-large", this is equivalent to the modelId property in the list-foundation-models api.
  */
  model: string;

  /** The AWS region e.g. `us-west-2`.
      Fallback to AWS_DEFAULT_REGION env variable or region specified in ~/.aws/config in case it is not provided here.
  */
  region?: string;

  /** AWS Credentials.
      If no credentials are provided, the default credentials from `@aws-sdk/credential-provider-node` will be used.
   */
  credentials?: CredentialType;

  /** Temperature. */
  temperature?: number;

  /** Max tokens. */
  maxTokens?: number;

  /** A custom fetch function for low-level access to AWS API. Defaults to fetch(). */
  fetchFn?: typeof fetch;

  /** @deprecated Use endpointHost instead Override the default endpoint url. */
  endpointUrl?: string;

  /** Override the default endpoint hostname. */
  endpointHost?: string;

  /**
   * Optional additional stop sequences to pass to the model. Currently only supported for Anthropic and AI21.
   * @deprecated Use .bind({ "stop": [...] }) instead
   * */
  stopSequences?: string[];

  /** Additional kwargs to pass to the model. */
  modelKwargs?: Record<string, unknown>;

  /** Whether or not to stream responses */
  streaming: boolean;

  /** Trace settings for the Bedrock Guardrails. */
  trace?: 'ENABLED' | 'DISABLED';

  /** Identifier for the guardrail configuration. */
  guardrailIdentifier?: string;

  /** Version for the guardrail configuration. */
  guardrailVersion?: string;

  /** Required when Guardrail is in use. */
  guardrailConfig?: {
    tagSuffix: string;
    streamProcessingMode: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
  };
}

interface Dict {
  [key: string]: unknown;
}

/**
 * A helper class used within the `Bedrock` class. It is responsible for
 * preparing the input and output for the Bedrock service. It formats the
 * input prompt based on the provider (e.g., "anthropic", "ai21",
 * "amazon") and extracts the generated text from the service response.
 */
export class BedrockLLMInputOutputAdapter {
  /** Adapter class to prepare the inputs from Langchain to a format
  that LLM model expects. Also, provides a helper function to extract
  the generated text from the model response. */

  static prepareInput(
    provider: string,
    prompt: string,
    maxTokens = 50,
    temperature = 0,
    stopSequences: string[] | undefined = undefined,
    modelKwargs: Record<string, unknown> = {},
    bedrockMethod: 'invoke' | 'invoke-with-response-stream' = 'invoke',
    guardrailConfig:
      | {
          tagSuffix: string;
          streamProcessingMode: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
        }
      | undefined = undefined
  ): Dict {
    const inputBody: Dict = {};

    if (provider === 'anthropic') {
      inputBody.prompt = prompt;
      inputBody.max_tokens_to_sample = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stop_sequences = stopSequences;
    } else if (provider === 'ai21') {
      inputBody.prompt = prompt;
      inputBody.maxTokens = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stopSequences = stopSequences;
    } else if (provider === 'meta') {
      inputBody.prompt = prompt;
      inputBody.max_gen_len = maxTokens;
      inputBody.temperature = temperature;
    } else if (provider === 'amazon') {
      inputBody.inputText = prompt;
      inputBody.textGenerationConfig = {
        maxTokenCount: maxTokens,
        temperature,
      };
    } else if (provider === 'cohere') {
      inputBody.prompt = prompt;
      inputBody.max_tokens = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stop_sequences = stopSequences;
      if (bedrockMethod === 'invoke-with-response-stream') {
        inputBody.stream = true;
      }
    } else if (provider === 'mistral') {
      inputBody.prompt = prompt;
      inputBody.max_tokens = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stop = stopSequences;
    }

    if (guardrailConfig && guardrailConfig.tagSuffix && guardrailConfig.streamProcessingMode) {
      inputBody['amazon-bedrock-guardrailConfig'] = guardrailConfig;
    }

    return { ...inputBody, ...modelKwargs };
  }

  static prepareMessagesInput(
    provider: string,
    messages: BaseMessage[],
    maxTokens = 1024,
    temperature = 0,
    stopSequences: string[] | undefined = undefined,
    modelKwargs: Record<string, unknown> = {},
    guardrailConfig:
      | {
          tagSuffix: string;
          streamProcessingMode: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
        }
      | undefined = undefined,
    tools: Array<StructuredToolInterface | Record<string, unknown>> = [],
    logger: Logger
  ): Dict {
    const inputBody: Dict = {};

    if (provider === 'anthropic') {
      const { system, messages: formattedMessages } = formatMessagesForAnthropic(messages, logger);
      if (system !== undefined) {
        inputBody.system = system;
      }
      inputBody.anthropic_version = 'bedrock-2023-05-31';
      inputBody.messages = formattedMessages;
      inputBody.max_tokens = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stop_sequences = stopSequences;

      if (tools.length > 0) {
        inputBody.tools = tools;
      }
      return { ...inputBody, ...modelKwargs };
    } else if (provider === 'cohere') {
      const {
        system,
        message: formattedMessage,
        chatHistory: formattedChatHistories,
      } = formatMessagesForCohere(messages);

      if (system !== undefined && system.length > 0) {
        inputBody.preamble = system;
      }
      inputBody.message = formattedMessage;
      inputBody.chat_history = formattedChatHistories;
      inputBody.max_tokens = maxTokens;
      inputBody.temperature = temperature;
      inputBody.stop_sequences = stopSequences;
    } else {
      throw new Error('The messages API is currently only supported by Anthropic or Cohere');
    }

    if (guardrailConfig && guardrailConfig.tagSuffix && guardrailConfig.streamProcessingMode) {
      inputBody['amazon-bedrock-guardrailConfig'] = guardrailConfig;
    }

    return { ...inputBody, ...modelKwargs };
  }

  /**
   * Extracts the generated text from the service response.
   * @param provider The provider name.
   * @param responseBody The response body from the service.
   * @returns The generated text.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static prepareOutput(provider: string, responseBody: any): string {
    if (provider === 'anthropic') {
      return responseBody.completion;
    } else if (provider === 'ai21') {
      return responseBody?.completions?.[0]?.data?.text ?? '';
    } else if (provider === 'cohere') {
      return responseBody?.generations?.[0]?.text ?? responseBody?.text ?? '';
    } else if (provider === 'meta') {
      return responseBody.generation;
    } else if (provider === 'mistral') {
      return responseBody?.outputs?.[0]?.text;
    }

    // I haven't been able to get a response with more than one result in it.
    return responseBody.results?.[0]?.outputText;
  }

  static prepareMessagesOutput(
    provider: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any
  ): ChatGeneration | undefined {
    const responseBody = response ?? {};
    if (provider === 'anthropic') {
      if (responseBody.type === 'message_start') {
        return parseMessage(responseBody.message, true);
      } else if (
        responseBody.type === 'content_block_delta' &&
        responseBody.delta?.type === 'text_delta' &&
        typeof responseBody.delta?.text === 'string'
      ) {
        return new ChatGenerationChunk({
          message: new AIMessageChunk({
            content: responseBody.delta.text,
          }),
          text: responseBody.delta.text,
        });
      } else if (responseBody.type === 'message_delta') {
        return new ChatGenerationChunk({
          message: new AIMessageChunk({ content: '' }),
          text: '',
          generationInfo: {
            ...responseBody.delta,
            usage: responseBody.usage,
          },
        });
      } else if (
        responseBody.type === 'message_stop' &&
        responseBody['amazon-bedrock-invocationMetrics'] !== undefined
      ) {
        return new ChatGenerationChunk({
          message: new AIMessageChunk({ content: '' }),
          text: '',
          generationInfo: {
            'amazon-bedrock-invocationMetrics': responseBody['amazon-bedrock-invocationMetrics'],
          },
        });
      } else if (responseBody.type === 'message') {
        return parseMessage(responseBody);
      } else {
        return undefined;
      }
    } else if (provider === 'cohere') {
      if (responseBody.event_type === 'stream-start') {
        return parseMessageCohere(responseBody.message, true);
      } else if (
        responseBody.event_type === 'text-generation' &&
        typeof responseBody?.text === 'string'
      ) {
        return new ChatGenerationChunk({
          message: new AIMessageChunk({
            content: responseBody.text,
          }),
          text: responseBody.text,
        });
      } else if (responseBody.event_type === 'search-queries-generation') {
        return parseMessageCohere(responseBody);
      } else if (
        responseBody.event_type === 'stream-end' &&
        responseBody.response !== undefined &&
        responseBody['amazon-bedrock-invocationMetrics'] !== undefined
      ) {
        return new ChatGenerationChunk({
          message: new AIMessageChunk({ content: '' }),
          text: '',
          generationInfo: {
            response: responseBody.response,
            'amazon-bedrock-invocationMetrics': responseBody['amazon-bedrock-invocationMetrics'],
          },
        });
      } else {
        if (
          responseBody.finish_reason === 'COMPLETE' ||
          responseBody.finish_reason === 'MAX_TOKENS'
        ) {
          return parseMessageCohere(responseBody);
        } else {
          return undefined;
        }
      }
    } else {
      throw new Error('The messages API is currently only supported by Anthropic or Cohere.');
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMessage(responseBody: any, asChunk?: boolean): ChatGeneration {
  const { content, id, ...generationInfo } = responseBody;
  let parsedContent;
  if (Array.isArray(content) && content.length === 1 && content[0].type === 'text') {
    parsedContent = content[0].text;
  } else if (Array.isArray(content) && content.length === 0) {
    parsedContent = '';
  } else {
    parsedContent = content;
  }
  if (asChunk) {
    return new ChatGenerationChunk({
      message: new AIMessageChunk({
        content: parsedContent,
        additional_kwargs: { id },
      }),
      text: typeof parsedContent === 'string' ? parsedContent : '',
      generationInfo,
    });
  } else {
    // TODO: we are throwing away here the text response, as the interface of this method returns only one
    const toolCalls = extractToolCalls(responseBody.content);

    if (toolCalls.length > 0) {
      return {
        message: new AIMessage({
          content: '',
          additional_kwargs: { id },
          tool_calls: toolCalls,
        }),
        text: typeof parsedContent === 'string' ? parsedContent : '',
        generationInfo,
      };
    }

    return {
      message: new AIMessage({
        content: parsedContent,
        additional_kwargs: { id },
        tool_calls: toolCalls,
      }),
      text: typeof parsedContent === 'string' ? parsedContent : '',
      generationInfo,
    };
  }
}

function parseMessageCohere(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseBody: any,
  asChunk?: boolean
): ChatGeneration {
  const { text, ...generationInfo } = responseBody;
  let parsedContent = text;
  if (typeof text !== 'string') {
    parsedContent = '';
  }
  if (asChunk) {
    return new ChatGenerationChunk({
      message: new AIMessageChunk({
        content: parsedContent,
      }),
      text: parsedContent,
      generationInfo,
    });
  } else {
    return {
      message: new AIMessage({
        content: parsedContent,
      }),
      text: parsedContent,
      generationInfo,
    };
  }
}
