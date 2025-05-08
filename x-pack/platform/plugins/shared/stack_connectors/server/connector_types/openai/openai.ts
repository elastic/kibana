/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import OpenAI from 'openai';
import { PassThrough } from 'stream';
import type { IncomingMessage } from 'http';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import fs from 'fs';
import https from 'https';
import type { Logger } from '@kbn/logging';
import { removeEndpointFromUrl } from './lib/openai_utils';
import type { Type } from '@kbn/config-schema';
import {
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
  InvokeAIActionParamsSchema,
} from '../../../common/openai/schema';
import type {
  Config,
  Secrets,
  RunActionParams,
  RunActionResponse,
  StreamActionParams,
} from '../../../common/openai/types';
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_TIMEOUT_MS,
  OpenAiProviderType,
  SUB_ACTION,
} from '../../../common/openai/constants';
import type {
  DashboardActionParams,
  DashboardActionResponse,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../../../common/openai/types';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  getAxiosOptions,
  getAzureApiVersionParameter,
  getRequestWithStreamOption,
  pipeStreamingResponse,
  sanitizeRequest,
  validatePKICertificates,
  getPKISSLOverrides,
  formatPEMContent,
} from './lib/utils';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url: string;
  private provider: OpenAiProviderType;
  private key: string;
  private openAI: OpenAI;
  private headers: Record<string, string>;
  private configAny: Config & {
    certificateFile?: string | string[];
    certificateData?: string;
    privateKeyFile?: string | string[];
    privateKeyData?: string;
    caFile?: string | string[];
    caData?: string;
    verificationMode?: 'full' | 'certificate' | 'none';
  };

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    // Top-level log to confirm constructor is called
    this.logger.debug('OpenAIConnector constructed');

    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    this.key = this.secrets.apiKey;
    this.headers = {
      ...this.config.headers,
      ...('organizationId' in this.config
        ? { 'OpenAI-Organization': this.config.organizationId }
        : {}),
      ...('projectId' in this.config ? { 'OpenAI-Project': this.config.projectId } : {}),
    };

    // Assign configAny for dynamic property access
    this.configAny = this.config as Config & {
      certificateFile?: string | string[];
      certificateData?: string;
      privateKeyFile?: string | string[];
      privateKeyData?: string;
      caFile?: string | string[];
      caData?: string;
      verificationMode?: 'full' | 'certificate' | 'none';
    };
    this.logger.debug(
      `Provider: ${this.provider}, certificateFile: ${this.configAny.certificateFile}, certificateData: ${this.configAny.certificateData}, privateKeyFile: ${this.configAny.privateKeyFile}, privateKeyData: ${this.configAny.privateKeyData}, caFile: ${this.configAny.caFile}, caData: ${this.configAny.caData}, verificationMode: ${this.configAny.verificationMode}`
    );

    try {
      if (
        this.provider === OpenAiProviderType.Other &&
        (this.configAny.certificateFile ||
          this.configAny.certificateData ||
          this.configAny.privateKeyFile ||
          this.configAny.privateKeyData)
      ) {
        // Validate PKI configuration
        if (
          !validatePKICertificates(
            this.logger,
            this.configAny.certificateFile,
            this.configAny.certificateData,
            this.configAny.privateKeyFile,
            this.configAny.privateKeyData
          )
        ) {
          throw new Error('Invalid or inaccessible PKI certificates');
        }
        const sslOverrides = getPKISSLOverrides(
          this.logger,
          this.configAny.certificateFile,
          this.configAny.certificateData,
          this.configAny.privateKeyFile,
          this.configAny.privateKeyData,
          this.configAny.caFile,
          this.configAny.caData,
          this.configAny.verificationMode
        );
        const httpsAgent = new https.Agent({
          ...sslOverrides,
        });
        try {
          this.openAI = new OpenAI({
            apiKey: this.key,
            baseURL: removeEndpointFromUrl(this.url),
            defaultHeaders: this.headers,
            httpAgent: httpsAgent,
          });
        } catch (error) {
          this.logger.error(`Error initializing OpenAI client: ${error.message}`);
          this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
          if (error.cause) {
            this.logger.error(`Error cause: ${JSON.stringify(error.cause, null, 2)}`);
          }
          throw error;
        }
      } else {
        this.openAI =
          this.config.apiProvider === OpenAiProviderType.AzureAi
            ? new OpenAI({
                apiKey: this.secrets.apiKey,
                baseURL: this.config.apiUrl,
                defaultQuery: { 'api-version': getAzureApiVersionParameter(this.config.apiUrl) },
                defaultHeaders: {
                  ...this.headers,
                  'api-key': this.secrets.apiKey,
                },
              })
            : new OpenAI({
                baseURL: removeEndpointFromUrl(this.config.apiUrl),
                apiKey: this.secrets.apiKey,
                defaultHeaders: this.headers,
              });
      }
    } catch (error) {
      this.logger.error(`Error initializing OpenAI client: ${error.message}`);
      throw error;
    }

    this.registerSubActions();
  }

  // Rest of the file remains unchanged
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
    if (error.message === '404 Unrecognized request argument supplied: functions') {
      return `API Error: ${error.message}
        \n\nFunction support with Azure OpenAI API was added in 2023-07-01-preview. Update the API version of the Azure OpenAI connector in use
      `;
    }
    if (!error.response?.status) {
      return `Unexpected API Error: ${error.code ?? ''} - ${error.message ?? 'Unknown error'}`;
    }
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
    if (
      this.provider === OpenAiProviderType.Other &&
      (this.configAny.certificateFile ||
        this.configAny.certificateData ||
        this.configAny.privateKeyFile ||
        this.configAny.privateKeyData)
    ) {
      const sanitizedBody = sanitizeRequest(
        this.provider, this.url, body, ...('defaultModel' in this.configAny ? [this.configAny.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, false);
      let sslOverrides: Record<string, any> | undefined;
      if (
        this.configAny.certificateFile ||
        this.configAny.certificateData ||
        this.configAny.privateKeyFile ||
        this.configAny.privateKeyData
      ) {
        sslOverrides = getPKISSLOverrides(
          this.logger,
          this.configAny.certificateFile,
          this.configAny.certificateData,
          this.configAny.privateKeyFile,
          this.configAny.privateKeyData,
          this.configAny.caFile,
          this.configAny.caData,
          this.configAny.verificationMode
        );
      }
      try {
        const response = await this.request(
          {
            url: this.url,
            method: 'post',
            responseSchema: RunActionResponseSchema,
            data: sanitizedBody,
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
            ...axiosOptions,
            headers: {
              ...this.headers,
              ...axiosOptions.headers,
            }, 
            sslOverrides,
          },
          connectorUsageCollector
        );

        this.logger.debug('runApi response:', JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (error) {
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
          );
        }
        if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || error.code === 'ERR_TLS_HANDSHAKE') {
          throw new Error(
            `TLS handshake failed: ${error.message}. Verify server certificate hostname and CA configuration.`
          );
        }
        throw error;
      }
    } else {
      const sanitizedBody = sanitizeRequest(
        this.provider,
        this.url,
        body,
        ...('defaultModel' in this.configAny ? [this.configAny.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, false);
      const response = await this.request(
        {
          url: this.url,
          method: 'post',
          responseSchema: RunActionResponseSchema,
          data: sanitizedBody,
          signal,
          timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          ...axiosOptions,
          headers: {
            ...this.headers,
            ...axiosOptions.headers,
          },
        },
        connectorUsageCollector
      );
      return response.data;
    }
  }

  /**
   * responsible for making a POST request to a specified URL with a given request body.
   * The method can handle both regular API requests and streaming requests based on the stream parameter.
   * It uses helper functions getRequestWithStreamOption and getAxiosOptions to prepare the request body and headers respectively.
   * The response is then processed based on whether it is a streaming response or a regular response.
   * @param body request body for the API request
   * @param stream flag indicating whether it is a streaming request or not
   */
   public async streamApi(
    { body, stream, signal, timeout }: StreamActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    if (
      this.provider === OpenAiProviderType.Other &&
      (this.configAny.certificateFile ||
        this.configAny.certificateData ||
        this.configAny.privateKeyFile ||
        this.configAny.privateKeyData)
    ) {
      const executeBody = getRequestWithStreamOption(
        this.provider, this.url, body, stream, ...('defaultModel' in this.configAny ? [this.configAny.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, stream);
      let sslOverrides: Record<string, any> | undefined;
      if (
        this.configAny.certificateFile ||
        this.configAny.certificateData ||
        this.configAny.privateKeyFile ||
        this.configAny.privateKeyData
      ) {
        sslOverrides = getPKISSLOverrides(
          this.logger,
          this.configAny.certificateFile,
          this.configAny.certificateData,
          this.configAny.privateKeyFile,
          this.configAny.privateKeyData,
          this.configAny.caFile,
          this.configAny.caData,
          this.configAny.verificationMode
        );
      }
      try {
        const response = await this.request(
          {
            url: this.url,
            method: 'post',
            responseSchema: stream ? StreamingResponseSchema : RunActionResponseSchema,
            data: executeBody,
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
            responseType: stream ? 'stream' : undefined,
            ...axiosOptions,
            headers: {
              ...this.headers,
              ...axiosOptions.headers,
            }, 
            sslOverrides,
          },
          connectorUsageCollector
        );

        this.logger.debug('streamApi response:', JSON.stringify(response.data, null, 2));
        return stream ? pipeStreamingResponse(response) : response.data;
      } catch (error) {
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
          );
        }
        if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || error.code === 'ERR_TLS_HANDSHAKE') {
          throw new Error(
            `TLS handshake failed: ${error.message}. Verify server certificate hostname and CA configuration.`
          );
        }
        throw error;
      }
    } else {
      const executeBody = getRequestWithStreamOption(
        this.provider,
        this.url,
        body,
        stream,
        ...('defaultModel' in this.configAny ? [this.configAny.defaultModel] : [])
      );
      const axiosOptions = getAxiosOptions(this.provider, this.key, stream);
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
        },
        connectorUsageCollector
      );
      return stream ? pipeStreamingResponse(response) : response.data;
    }
  }

  /**
   * retrieves a dashboard from the Kibana server and checks if the
   * user has the necessary privileges to access it.
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
        timeout,
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
      const requestBody: ChatCompletionCreateParamsStreaming = {
        ...rest,
        stream: true,
        messages,
        model:
          rest.model ??
          ('defaultModel' in this.configAny ? this.configAny.defaultModel : DEFAULT_OPENAI_MODEL),
      };
      connectorUsageCollector.addRequestBodyBytes(undefined, requestBody);
      const stream = await this.openAI.chat.completions.create(requestBody, {
        signal,
        timeout,
      });
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
    } catch (e) {
      const errorMessage = this.getResponseErrorMessage(e);
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