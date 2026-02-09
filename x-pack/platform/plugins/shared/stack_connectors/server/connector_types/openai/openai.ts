/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SSLSettings } from '@kbn/actions-utils';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import OpenAI from 'openai';
import { PassThrough } from 'stream';
import type { Agent as HttpsAgent } from 'https';
import type { Agent as HttpAgent, IncomingMessage } from 'http';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';
import { trace } from '@opentelemetry/api';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';
import { getCustomAgents } from '@kbn/actions-plugin/server/lib/get_custom_agents';
import {
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  OpenAiProviderType,
  SUB_ACTION,
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
  InvokeAIActionParamsSchema,
} from '@kbn/connector-schemas/openai';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  StreamActionParams,
  DashboardActionParams,
  DashboardActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '@kbn/connector-schemas/openai';
import { removeEndpointFromUrl } from './lib/openai_utils';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  getAxiosOptions,
  getAzureApiVersionParameter,
  getRequestWithStreamOption,
  pipeStreamingResponse,
  sanitizeRequest,
} from './lib/utils';
import { getPKISSLOverrides, pkiErrorHandler } from './lib/other_openai_utils';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url: string;
  private provider: OpenAiProviderType;
  private key: string;
  private openAI: OpenAI;
  private headers: Record<string, string>;
  private sslOverrides?: SSLSettings;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);
    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    // apiKey could be undefined if PKI, use mock value when this is the case
    this.key = 'apiKey' in this.secrets && this.secrets.apiKey ? this.secrets.apiKey : '';
    this.headers = {
      ...this.config.headers,
      ...('organizationId' in this.config
        ? { 'OpenAI-Organization': this.config.organizationId }
        : {}),
      ...('projectId' in this.config ? { 'OpenAI-Project': this.config.projectId } : {}),
    };

    try {
      let httpAgent;
      let baseURL = this.config.apiUrl;
      const defaultHeaders = { ...this.headers };
      let defaultQuery: Record<string, string> | undefined;

      const isHttps = this.url.toLowerCase().startsWith('https');

      if (
        this.provider === OpenAiProviderType.Other &&
        (('certificateData' in this.secrets && this.secrets.certificateData) ||
          ('caData' in this.secrets && this.secrets.caData) ||
          ('privateKeyData' in this.secrets && this.secrets.privateKeyData)) &&
        'verificationMode' in this.config &&
        this.config.verificationMode
      ) {
        this.sslOverrides = getPKISSLOverrides({
          logger: this.logger,
          // ! These two values must be defined for PKI use. If undefined, will throw error
          certificateData: this.secrets.certificateData!,
          privateKeyData: this.secrets.privateKeyData!,
          caData: this.secrets.caData,
          verificationMode: this.config.verificationMode,
        });
        const agents = getCustomAgents(
          this.configurationUtilities,
          this.logger,
          this.url,
          this.sslOverrides
        );
        httpAgent = isHttps ? agents.httpsAgent : agents.httpAgent;
        baseURL = removeEndpointFromUrl(this.url);
      } else {
        const agents = getCustomAgents(this.configurationUtilities, this.logger, this.url);
        httpAgent = isHttps ? agents.httpsAgent : agents.httpAgent;
        if (this.config.apiProvider === OpenAiProviderType.AzureAi) {
          baseURL = this.config.apiUrl;
          defaultHeaders['api-key'] = this.key;
          const apiVersion = getAzureApiVersionParameter(this.config.apiUrl);
          if (apiVersion) {
            defaultQuery = { 'api-version': apiVersion };
          }
        } else {
          baseURL = removeEndpointFromUrl(this.config.apiUrl);
        }
      }

      this.openAI = this.createOpenAIClient({
        apiKey: this.key,
        baseURL,
        defaultHeaders,
        httpAgent,
        defaultQuery,
      });
    } catch (error) {
      this.logger.error(`Error initializing OpenAI client: ${error.message}`);
      throw error;
    }

    this.registerSubActions();
  }

  private createOpenAIClient({
    apiKey,
    baseURL,
    defaultHeaders,
    httpAgent,
    defaultQuery,
  }: {
    apiKey: string;
    baseURL: string;
    defaultHeaders: Record<string, string>;
    httpAgent?: HttpsAgent | HttpAgent;
    defaultQuery?: Record<string, string>;
  }): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders,
      httpAgent,
      defaultQuery,
    });
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: RunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.STREAM,
      method: 'streamApi',
      schema: StreamActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DASHBOARD,
      method: 'getDashboard',
      schema: DashboardActionParamsSchema,
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
      name: SUB_ACTION.INVOKE_ASYNC_ITERATOR,
      method: 'invokeAsyncIterator',
      schema: InvokeAIActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<{ error?: { message?: string } }>): string {
    // handle known Azure error from early release, we can probably get rid of this eventually
    if (error.message === '404 Unrecognized request argument supplied: functions') {
      // add information for known Azure error
      return `API Error: ${error.message}
        \n\nFunction support with Azure OpenAI API was added in 2023-07-01-preview. Update the API version of the Azure OpenAI connector in use
      `;
    }
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
    // LM Studio returns error.response?.data?.error as string
    const errorMessage = error.response?.data?.error?.message ?? error.response?.data?.error;
    if (error.response.status === 401) {
      return `Unauthorized API Error${errorMessage ? ` - ${errorMessage}` : ''}`;
    }
    return `API Error: ${error.response?.statusText}${errorMessage ? ` - ${errorMessage}` : ''}`;
  }

  /**
   * responsible for making a POST request to the external API endpoint and returning the response data
   * @param body The stringified request body to be sent in the POST request.
   */
  public async runApi(
    { body, signal, timeout }: RunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    const parentSpan = trace.getActiveSpan();

    const sanitizedBody = sanitizeRequest(
      this.provider,
      this.url,
      body,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );

    parentSpan?.setAttribute('openai.raw_request', sanitizedBody);

    const axiosOptions = getAxiosOptions(this.provider, this.key, false);

    try {
      const response = await this.request(
        {
          url: this.url,
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: sanitizedBody,
          signal,
          // give up to 2 minutes for response
          timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          ...axiosOptions,
          headers: {
            ...this.headers,
            ...axiosOptions.headers,
          },
          sslOverrides: this.sslOverrides,
        },
        connectorUsageCollector
      );

      return response.data;
    } catch (error) {
      // special error handling for PKI errors
      const errorMessage = pkiErrorHandler(error);
      if (errorMessage?.length) {
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   *  responsible for making a POST request to a specified URL with a given request body.
   *  The method can handle both regular API requests and streaming requests based on the stream parameter.
   *  It uses helper functions getRequestWithStreamOption and getAxiosOptions to prepare the request body and headers respectively.
   *  The response is then processed based on whether it is a streaming response or a regular response.
   * @param body request body for the API request
   * @param stream flag indicating whether it is a streaming request or not
   */
  public async streamApi(
    { body, stream, signal, timeout }: StreamActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    const parentSpan = trace.getActiveSpan();

    const executeBody = getRequestWithStreamOption(
      this.provider,
      this.url,
      body,
      stream,
      ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
    );

    parentSpan?.setAttribute('openai.raw_request', executeBody);

    const axiosOptions = getAxiosOptions(this.provider, this.key, stream);
    try {
      const response = await this.request(
        {
          url: this.url,
          method: 'post',
          responseSchema: stream ? StreamingResponseSchema : RunActionResponseSchema,
          data: executeBody,
          signal,
          ...axiosOptions,
          headers: {
            ...this.headers,
            ...axiosOptions.headers,
          },
          timeout,
          sslOverrides: this.sslOverrides,
        },
        connectorUsageCollector
      );

      // @ts-expect-error upgrade typescript v5.9.3
      return stream ? pipeStreamingResponse(response) : response.data;
    } catch (error) {
      // special error handling for PKI errors
      const errorMessage = pkiErrorHandler(error);
      if (errorMessage?.length) {
        throw new Error(errorMessage);
      }
      throw error;
    }
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
      genAIProvider: 'OpenAI',
    });

    return { available: response.success };
  }

  /**
   * Streamed security solution AI Assistant requests (non-langchain)
   * Responsible for invoking the streamApi method with the provided body and
   * stream parameters set to true. It then returns a ReadableStream, meant to be
   * returned directly to the client for streaming
   * @param body - the OpenAI Invoke request body
   */
  public async invokeStream(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<PassThrough> {
    const { signal, timeout, telemetryMetadata: _telemetryMetadata, ...rest } = body;

    const res = (await this.streamApi(
      {
        body: JSON.stringify(rest),
        stream: true,
        signal,
        timeout, // do not default if not provided
      },
      connectorUsageCollector
    )) as unknown as IncomingMessage;

    return res.pipe(new PassThrough());
  }

  /**
   * Streamed security solution AI Assistant requests (langchain)
   * Uses the official OpenAI Node library, which handles Server-sent events for you.
   * @param body - the OpenAI Invoke request body
   * @returns {
   *  consumerStream: Stream<ChatCompletionChunk>; the result to be read/transformed on the server and sent to the client via Server Sent Events
   *  tokenCountStream: Stream<ChatCompletionChunk>; the result for token counting stream
   * }
   */
  public async invokeAsyncIterator(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    consumerStream: Stream<ChatCompletionChunk>;
    tokenCountStream: Stream<ChatCompletionChunk>;
  }> {
    try {
      const { signal, timeout, telemetryMetadata: _telemetryMetadata, ...rest } = body;
      const messages = rest.messages as unknown as ChatCompletionMessageParam[];
      let model: string = DEFAULT_MODEL;
      if (rest.model) {
        model = rest.model;
      } else if ('defaultModel' in this.config && this.config.defaultModel) {
        model = this.config.defaultModel;
      }
      const requestBody: ChatCompletionCreateParamsStreaming = {
        ...rest,
        stream: true,
        messages,
        model,
      };

      connectorUsageCollector.addRequestBodyBytes(undefined, requestBody);
      const stream = await this.openAI.chat.completions.create(requestBody, {
        signal,
        timeout, // do not default if not provided
      });
      // splits the stream in two, teed[0] is used for the UI and teed[1] for token tracking
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
      // since we do not use the sub action connector request method, we need to do our own error handling
    } catch (e) {
      const errorMessage = this.getResponseErrorMessage(e);

      // Based on the OpenAI API documentation, the error contains the status code in the `status` property
      if (e.status === 429) {
        throw createTaskRunError(new Error(errorMessage), TaskErrorSource.USER);
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Non-streamed security solution AI Assistant requests
   * Responsible for invoking the runApi method with the provided body.
   * It then formats the response into a string
   * To use function calling, call the run subaction directly
   * @param body - the OpenAI chat completion request body
   * @returns an object with the response string and the usage object
   */
  public async invokeAI(
    body: InvokeAIActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<InvokeAIActionResponse> {
    const { signal, timeout, telemetryMetadata: _telemetryMetadata, ...rest } = body;
    const res = await this.runApi(
      { body: JSON.stringify(rest), signal, timeout },
      connectorUsageCollector
    );

    if (res.choices && res.choices.length > 0 && res.choices[0].message?.content) {
      const result = res.choices[0].message.content.trim();
      return { message: result, usage: res.usage };
    }

    return {
      message:
        'An error occurred sending your message. \n\nAPI Error: The response from OpenAI was in an unrecognized format.',
      ...(res.usage
        ? { usage: res.usage }
        : { usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }),
    };
  }
}
