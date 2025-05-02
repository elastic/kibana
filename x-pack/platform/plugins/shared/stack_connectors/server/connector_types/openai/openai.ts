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
import { removeEndpointFromUrl } from './lib/openai_utils';
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
} from './lib/utils';
import fs from 'fs';
import https from 'https';

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url: string;
  private provider: OpenAiProviderType;
  private key: string;
  private openAI: OpenAI;
  private headers: Record<string, string>;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

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

    try {
      if (
        this.provider === OpenAiProviderType.Other &&
        (this.config.certificateFile ||
          this.config.certificateData ||
          this.config.privateKeyFile ||
          this.config.privateKeyData)
      ) {
        // Validate PKI configuration
        if (
          !validatePKICertificates(
            this.config.certificateFile,
            this.config.certificateData,
            this.config.privateKeyFile,
            this.config.privateKeyData
          )
        ) {
          throw new Error('Invalid or inaccessible PKI certificates');
        }

        // Parse certificate and key from file or content
        let cert: string | Buffer;
        let key: string | Buffer;

        // Utility to parse PEM content (file or string)
        const parsePemContent = (content: string): { cert: string, key: string } => {
          const certMatch = content.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
          const keyMatch = content.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
          return {
            cert: certMatch ? certMatch.join('\n') : '',
            key: keyMatch ? keyMatch[0] : '',
          };
        };

        // Normalize PEM strings to ensure consistent formatting
        const normalizePem = (pem: string): string => {
          return pem.replace(/\r\n|\r|\n/g, '\n').trim();
        };

        if (this.config.certificateFile) {
          const fileContent = fs.readFileSync(
            Array.isArray(this.config.certificateFile)
              ? this.config.certificateFile[0]
              : this.config.certificateFile,
            'utf8'
          );
          const { cert: parsedCert } = parsePemContent(fileContent);
          if (!parsedCert) {
            throw new Error(`No certificate found in ${this.config.certificateFile}`);
          }
          cert = parsedCert;
          this.logger.debug(`Loaded certificate from file: ${this.config.certificateFile}, cert: ${parsedCert.substring(0, 50)}...`);
        } else if (this.config.certificateData) {
          this.logger.debug(`Raw certificateData length: ${this.config.certificateData.length}`);
          const normalizedData = normalizePem(this.config.certificateData);
          const { cert: parsedCert } = parsePemContent(normalizedData);
          if (!parsedCert) {
            throw new Error('No certificate found in certificateData');
          }
          cert = parsedCert;
          this.logger.debug(`Using certificate data: ${parsedCert.substring(0, 50)}..., normalized length: ${normalizedData.length}`);
        } else {
          throw new Error('No certificate file or data provided');
        }

        if (this.config.privateKeyFile) {
          const fileContent = fs.readFileSync(
            Array.isArray(this.config.privateKeyFile)
              ? this.config.privateKeyFile[0]
              : this.config.privateKeyFile,
            'utf8'
          );
          const { key: parsedKey } = parsePemContent(fileContent);
          if (!parsedKey) {
            throw new Error(`No private key found in ${this.config.privateKeyFile}`);
          }
          key = parsedKey;
          this.logger.debug(`Loaded private key from file: ${this.config.privateKeyFile}, key: ${parsedKey.substring(0, 50)}...`);
        } else if (this.config.privateKeyData) {
          this.logger.debug(`Raw privateKeyData length: ${this.config.privateKeyData.length}`);
          const normalizedData = normalizePem(this.config.privateKeyData);
          const { key: parsedKey } = parsePemContent(normalizedData);
          if (!parsedKey) {
            throw new Error('No private key found in privateKeyData');
          }
          key = parsedKey;
          this.logger.debug(`Using private key data: ${parsedKey.substring(0, 50)}..., normalized length: ${normalizedData.length}`);
        } else {
          throw new Error('No private key file or data provided');
        }

        try {
          const httpsAgent = new https.Agent({
            cert,
            key,
            rejectUnauthorized: this.config.verificationMode !== 'none',
            checkServerIdentity:
              this.config.verificationMode === 'certificate' || this.config.verificationMode === 'none'
                ? () => undefined
                : undefined,
          });

          this.openAI = new OpenAI({
            apiKey: this.key,
            baseURL: removeEndpointFromUrl(this.url),
            defaultHeaders: this.headers,
            httpAgent: httpsAgent,
          });
        } catch (agentError) {
          this.logger.error(`Failed to initialize https.Agent: ${agentError.message}, stack: ${agentError.stack}`);
          throw agentError;
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
      this.logger.error(`Error initializing OpenAI client: ${error.message}, stack: ${error.stack}`);
      throw error;
    }

    this.registerSubActions();
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

  public async runApi(
    { body, signal, timeout }: RunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    if (
      this.provider === OpenAiProviderType.Other &&
      (this.config.certificateFile ||
        this.config.certificateData ||
        this.config.privateKeyFile ||
        this.config.privateKeyData)
    ) {
      try {
        const sanitizedBody = JSON.parse(body);
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
          },
          {
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          }
        );
        this.logger.debug(`PKI OpenAI Response (runApi): ${JSON.stringify(response)}`);
        return response as RunActionResponse;
      } catch (error) {
        this.logger.error(`runApi failed: ${error.message}, stack: ${error.stack}`);
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
          );
        }
        throw new Error(`Connection error: ${error.message}`);
      }
    } else {
      const sanitizedBody = sanitizeRequest(
        this.provider,
        this.url,
        body,
        ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
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

  public async streamApi(
    { body, stream, signal, timeout }: StreamActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<RunActionResponse> {
    if (
      this.provider === OpenAiProviderType.Other &&
      (this.config.certificateFile ||
        this.config.certificateData ||
        this.config.privateKeyFile ||
        this.config.privateKeyData)
    ) {
      try {
        const sanitizedBody = JSON.parse(body);
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
            stream,
          },
          {
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          }
        );
        this.logger.debug(`PKI OpenAI Streaming Response (streamApi): ${JSON.stringify(response)}`);
        return stream ? (response as unknown as RunActionResponse) : (response as RunActionResponse);
      } catch (error) {
        this.logger.error(`streamApi failed: ${error.message}, stack: ${error.stack}`);
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
          );
        }
        throw new Error(`Connection error: ${error.message}`);
      }
    } else {
      const executeBody = getRequestWithStreamOption(
        this.provider,
        this.url,
        body,
        stream,
        ...('defaultModel' in this.config ? [this.config.defaultModel] : [])
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
          ('defaultModel' in this.config ? this.config.defaultModel : DEFAULT_OPENAI_MODEL),
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
