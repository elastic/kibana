/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import aws from 'aws4';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { SmithyMessageDecoderStream } from '@smithy/eventstream-codec';
import { AxiosError, Method } from 'axios';
import { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  RunActionParamsSchema,
  InvokeAIActionParamsSchema,
  InvokeAIRawActionParamsSchema,
  InvokeAIRawActionResponseSchema,
  StreamingResponseSchema,
  RunActionResponseSchema,
  RunApiLatestResponseSchema,
  BedrockClientSendParamsSchema,
} from '../../../common/bedrock/schema';
import {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
  InvokeAIRawActionParams,
  InvokeAIRawActionResponse,
  RunApiLatestResponse,
  BedrockMessage,
  BedrockToolChoice,
  ConverseActionParams,
  ConverseActionResponse,
} from '../../../common/bedrock/types';
import {
  SUB_ACTION,
  DEFAULT_TOKEN_LIMIT,
  DEFAULT_TIMEOUT_MS,
} from '../../../common/bedrock/constants';
import {
  DashboardActionParams,
  DashboardActionResponse,
  StreamingResponse,
} from '../../../common/bedrock/types';
import { DashboardActionParamsSchema } from '../../../common/bedrock/schema';

interface SignedRequest {
  host: string;
  headers: Record<string, string>;
  body: string;
  path: string;
}

export class BedrockConnector extends SubActionConnector<Config, Secrets> {
  private url;
  private model;
  private bedrockClient;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.model = this.config.defaultModel;
    this.bedrockClient = new BedrockRuntimeClient({
      region: extractRegionId(this.config.apiUrl),
      credentials: {
        accessKeyId: this.secrets.accessKey,
        secretAccessKey: this.secrets.secret,
      },
    });
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DASHBOARD,
      method: 'getDashboard',
      schema: DashboardActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_AI,
      method: 'invokeAI',
      schema: InvokeAIActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_STREAM,
      method: 'invokeStream',
      schema: InvokeAIActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.INVOKE_AI_RAW,
      method: 'invokeAIRaw',
      schema: InvokeAIRawActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.BEDROCK_CLIENT_SEND,
      method: 'bedrockClientSend',
      schema: BedrockClientSendParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ message?: string }>): string {
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    if (
      error.response.status === 400 &&
      error.response?.data?.message === 'The requested operation is not recognized by the service.'
    ) {
      // Leave space in the string below, \n is not being rendered in the UI
      return `API Error: ${error.response.data.message}

The Kibana Connector in use may need to be reconfigured with an updated Amazon Bedrock endpoint, like \`bedrock-runtime\`.`;
    }
    if (error.response.status === 401) {
      return `Unauthorized API Error${
        error.response?.data?.message ? `: ${error.response.data.message}` : ''
      }`;
    }
    return `API Error: ${error.response?.statusText}${
      error.response?.data?.message ? ` - ${error.response.data.message}` : ''
    }`;
  }

  /**
   * provides the AWS signature to the external API endpoint
   * @param body The request body to be signed.
   * @param path The path of the request URL.
   */
  private signRequest(body: string, path: string, stream: boolean) {
    const { host } = new URL(this.url);
    return aws.sign(
      {
        host,
        headers: stream
          ? {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            }
          : {
              'Content-Type': 'application/json',
              Accept: '*/*',
            },
        body,
        path,
        // Despite AWS docs, this value does not always get inferred. We need to always send it
        service: 'bedrock',
      },
      {
        secretAccessKey: this.secrets.secret,
        accessKeyId: this.secrets.accessKey,
      }
    ) as SignedRequest;
  }

  /**
   *  retrieves a dashboard from the Kibana server and checks if the
   *  user has the necessary privileges to access it.
   * @param dashboardId The ID of the dashboard to retrieve.
   */
  public async getDashboard({
    dashboardId,
  }: DashboardActionParams): Promise<DashboardActionResponse> {
    const privilege = (await this.esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: ['.kibana-event-log-*'],
            allow_restricted_indices: true,
            privileges: ['read'],
          },
        ],
      },
    })) as { has_all_requested: boolean };

    if (!privilege?.has_all_requested) {
      return { available: false };
    }

    const response = await initDashboard({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      dashboardId,
      genAIProvider: 'Bedrock',
    });

    return { available: response.success };
  }

  private async runApiRaw(
    params: SubActionRequestParams<RunActionResponse | InvokeAIRawActionResponse>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse | InvokeAIRawActionResponse> {
    const response = await this.request(params, connectorUsageCollector);
    return response.data;
  }

  private async runApiLatest(
    params: SubActionRequestParams<RunApiLatestResponse>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    const response = await this.request(params, connectorUsageCollector);
    // keeping the response the same as claude 2 for our APIs
    // adding the usage object for better token tracking
    return {
      completion: parseContent(response.data.content),
      stop_reason: response.data.stop_reason,
      usage: response.data.usage,
    };
  }

  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   * @param signal Optional signal to cancel the request.
   * @param timeout Optional timeout for the request.
   * @param raw Optional flag to indicate if the response should be returned as raw data.
   */
  public async runApi(
    { body, model: reqModel, signal, timeout, raw }: RunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse | InvokeAIRawActionResponse> {
    // set model on per request basis
    const currentModel = reqModel ?? this.model;
    const path = `/model/${currentModel}/invoke`;
    const signed = this.signRequest(body, path, false);
    const requestArgs = {
      ...signed,
      url: `${this.url}${path}`,
      method: 'post' as Method,
      data: body,
      signal,
      // give up to 2 minutes for response
      timeout: timeout ?? DEFAULT_TIMEOUT_MS,
    };

    if (raw) {
      return this.runApiRaw(
        { ...requestArgs, responseSchema: InvokeAIRawActionResponseSchema },
        connectorUsageCollector
      );
    }
    // possible api received deprecated arguments, which will still work with the deprecated Claude 2 models
    if (usesDeprecatedArguments(body)) {
      return this.runApiRaw(
        { ...requestArgs, responseSchema: RunActionResponseSchema },
        connectorUsageCollector
      );
    }
    return this.runApiLatest(
      { ...requestArgs, responseSchema: RunApiLatestResponseSchema },
      connectorUsageCollector
    );
  }

  /**
   *  NOT INTENDED TO BE CALLED DIRECTLY
   *  call invokeStream instead
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The response is then processed based on whether it is a streaming response or a regular response.
   * @param body The stringified request body to be sent in the POST request.
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  private async streamApi(
    { body, model: reqModel, signal, timeout }: RunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<StreamingResponse> {
    // set model on per request basis
    const path = `/model/${reqModel ?? this.model}/invoke-with-response-stream`;
    const signed = this.signRequest(body, path, true);

    const response = await this.request(
      {
        ...signed,
        url: `${this.url}${path}`,
        method: 'post',
        responseSchema: StreamingResponseSchema,
        data: body,
        responseType: 'stream',
        signal,
        timeout,
      },
      connectorUsageCollector
    );

    return response.data.pipe(new PassThrough());
  }

  /**
   *  takes in an array of messages and a model as inputs. It calls the streamApi method to make a
   *  request to the Bedrock API with the formatted messages and model. It then returns a Transform stream
   *  that pipes the response from the API through the transformToString function,
   *  which parses the proprietary response into a string of the response text alone
   * @param messages An array of messages to be sent to the API
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   */
  public async invokeStream(
    {
      messages,
      model,
      stopSequences,
      system,
      temperature,
      signal,
      timeout,
      tools,
      toolChoice,
    }: InvokeAIRawActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<IncomingMessage> {
    const res = (await this.streamApi(
      {
        body: JSON.stringify(
          formatBedrockBody({ messages, stopSequences, system, temperature, tools, toolChoice })
        ),
        model,
        signal,
        timeout,
      },
      connectorUsageCollector
    )) as unknown as IncomingMessage;
    return res;
  }

  /**
   * Non-streamed security solution AI Assistant requests
   * Responsible for invoking the runApi method with the provided body.
   * It then formats the response into a string
   * @param messages An array of messages to be sent to the API
   * @param model Optional model to be used for the API request. If not provided, the default model from the connector will be used.
   * @returns an object with the response string as a property called message
   */
  public async invokeAI(
    {
      messages,
      model,
      stopSequences,
      system,
      temperature,
      maxTokens,
      signal,
      timeout,
      tools,
      toolChoice,
    }: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<InvokeAIActionResponse> {
    const res = (await this.runApi(
      {
        body: JSON.stringify(
          formatBedrockBody({
            messages,
            stopSequences,
            system,
            temperature,
            maxTokens,
            tools,
            toolChoice,
          })
        ),
        model,
        signal,
        timeout,
      },
      connectorUsageCollector
    )) as RunActionResponse;
    return { message: res.completion.trim(), usage: res?.usage };
  }

  public async invokeAIRaw(
    {
      messages,
      model,
      stopSequences,
      system,
      temperature,
      maxTokens = DEFAULT_TOKEN_LIMIT,
      signal,
      timeout,
      tools,
      toolChoice,
      anthropicVersion,
    }: InvokeAIRawActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<InvokeAIRawActionResponse> {
    const res = await this.runApi(
      {
        body: JSON.stringify({
          messages,
          stop_sequences: stopSequences,
          system,
          temperature,
          max_tokens: maxTokens,
          tools,
          tool_choice: toolChoice,
          anthropic_version: anthropicVersion,
        }),
        model,
        signal,
        timeout,
        raw: true,
      },
      connectorUsageCollector
    );
    return res;
  }

  /**
   * Sends a request via the BedrockRuntimeClient to perform a conversation action.
   * @param params - The parameters for the conversation action.
   * @param params.signal - The signal to cancel the request.
   * @param params.command - The command class to be sent to the API. (ConverseCommand | ConverseStreamCommand)
   * @param connectorUsageCollector - The usage collector for the connector.
   * @returns A promise that resolves to the response of the conversation action.
   */
  public async bedrockClientSend(
    { signal, command }: ConverseActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ConverseActionResponse> {
    connectorUsageCollector.addRequestBodyBytes(undefined, command);
    const res = await this.bedrockClient.send(command, {
      abortSignal: signal,
    });

    if ('stream' in res) {
      const resultStream = res.stream as SmithyMessageDecoderStream<unknown>;
      // splits the stream in two, [stream = consumer, tokenStream = token tracking]
      const [stream, tokenStream] = tee(resultStream);
      return { ...res, stream, tokenStream };
    }

    return res;
  }
}

const formatBedrockBody = ({
  messages,
  stopSequences,
  temperature = 0,
  system,
  maxTokens = DEFAULT_TOKEN_LIMIT,
  tools,
  toolChoice,
}: {
  messages: BedrockMessage[];
  stopSequences?: string[];
  temperature?: number;
  maxTokens?: number;
  // optional system message to be sent to the API
  system?: string;
  tools?: Array<{ name: string; description: string }>;
  toolChoice?: BedrockToolChoice;
}) => ({
  anthropic_version: 'bedrock-2023-05-31',
  ...ensureMessageFormat(messages, system),
  max_tokens: maxTokens,
  stop_sequences: stopSequences,
  temperature,
  tools,
  tool_choice: toolChoice,
});

interface FormattedBedrockMessage {
  role: string;
  content: string | BedrockMessage['rawContent'];
}

/**
 * Ensures that the messages are in the correct format for the Bedrock API
 * If 2 user or 2 assistant messages are sent in a row, Bedrock throws an error
 * We combine the messages into a single message to avoid this error
 * @param messages
 */
const ensureMessageFormat = (
  messages: BedrockMessage[],
  systemPrompt?: string
): {
  messages: FormattedBedrockMessage[];
  system?: string;
} => {
  let system = systemPrompt ? systemPrompt : '';

  const newMessages = messages.reduce<FormattedBedrockMessage[]>((acc, m) => {
    if (m.role === 'system') {
      system = `${system.length ? `${system}\n` : ''}${m.content}`;
      return acc;
    }

    const messageRole = () => (['assistant', 'ai'].includes(m.role) ? 'assistant' : 'user');

    if (m.rawContent) {
      acc.push({
        role: messageRole(),
        content: m.rawContent,
      });
      return acc;
    }

    const lastMessage = acc[acc.length - 1];
    if (lastMessage && lastMessage.role === m.role && typeof lastMessage.content === 'string') {
      // Bedrock only accepts assistant and user roles.
      // If 2 user or 2 assistant messages are sent in a row, combine the messages into a single message
      return [
        ...acc.slice(0, -1),
        { content: `${lastMessage.content}\n${m.content}`, role: m.role },
      ];
    }

    // force role outside of system to ensure it is either assistant or user
    return [...acc, { content: m.content, role: messageRole() }];
  }, []);

  return system.length ? { system, messages: newMessages } : { messages: newMessages };
};

function parseContent(content: Array<{ text?: string; type: string }>): string {
  let parsedContent = '';
  if (content.length === 1 && content[0].type === 'text' && content[0].text) {
    parsedContent = content[0].text;
  } else if (content.length > 1) {
    parsedContent = content.reduce((acc, { text }) => (text ? `${acc}\n${text}` : acc), '');
  }
  return parsedContent;
}

const usesDeprecatedArguments = (body: string): boolean => JSON.parse(body)?.prompt != null;

function extractRegionId(url: string) {
  const match = (url ?? '').match(/bedrock\.(.*?)\.amazonaws\./);
  if (match) {
    return match[1];
  } else {
    // fallback to us-east-1
    return 'us-east-1';
  }
}

/**
 * Splits an async iterator into two independent async iterators which can be independently read from at different speeds.
 * @param asyncIterator The async iterator returned from Bedrock to split
 */
function tee<T>(
  asyncIterator: SmithyMessageDecoderStream<T>
): [SmithyMessageDecoderStream<T>, SmithyMessageDecoderStream<T>] {
  // @ts-ignore options is private, but we need it to create the new streams
  const streamOptions = asyncIterator.options;

  const streamLeft = new SmithyMessageDecoderStream<T>(streamOptions);
  const streamRight = new SmithyMessageDecoderStream<T>(streamOptions);

  // Queues to store chunks for each stream
  const leftQueue: T[] = [];
  const rightQueue: T[] = [];

  // Promises for managing when a chunk is available
  let leftPending: ((chunk: T | null) => void) | null = null;
  let rightPending: ((chunk: T | null) => void) | null = null;

  const distribute = async () => {
    for await (const chunk of asyncIterator) {
      // Push the chunk into both queues
      if (leftPending) {
        leftPending(chunk);
        leftPending = null;
      } else {
        leftQueue.push(chunk);
      }

      if (rightPending) {
        rightPending(chunk);
        rightPending = null;
      } else {
        rightQueue.push(chunk);
      }
    }

    // Signal the end of the iterator
    if (leftPending) {
      leftPending(null);
    }
    if (rightPending) {
      rightPending(null);
    }
  };

  // Start distributing chunks from the iterator
  distribute().catch(() => {
    // swallow errors
  });

  // Helper to create an async iterator for each stream
  const createIterator = (
    queue: T[],
    setPending: (fn: ((chunk: T | null) => void) | null) => void
  ) => {
    return async function* () {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const chunk = await new Promise<T | null>((resolve) => setPending(resolve));
          if (chunk === null) break; // End of the stream
          yield chunk;
        }
      }
    };
  };

  // Assign independent async iterators to each stream
  streamLeft[Symbol.asyncIterator] = createIterator(leftQueue, (fn) => (leftPending = fn));
  streamRight[Symbol.asyncIterator] = createIterator(rightQueue, (fn) => (rightPending = fn));

  return [streamLeft, streamRight];
}
