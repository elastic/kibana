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

// Add this function to properly format PEM content
function formatPEMContent(pemContent: string): string {
  if (!pemContent) return pemContent;

  // First split on spaces to handle UI's conversion of line breaks
  const parts = pemContent.split(/\s+/);
  
  // Find header and footer
  const headerIndex = parts.findIndex(part => part.startsWith('-----BEGIN'));
  const footerIndex = parts.findIndex(part => part.startsWith('-----END'));
  
  if (headerIndex === -1 || footerIndex === -1) return pemContent;
  
  // Reconstruct header and footer properly
  let header = parts[headerIndex];
  let footer = parts[footerIndex];
  
  // Handle multi-part headers/footers (e.g., "-----BEGIN PRIVATE KEY-----")
  if (header === '-----BEGIN' && parts[headerIndex + 1]) {
    header = `${header} ${parts[headerIndex + 1]}`;
    if (parts[headerIndex + 2] && parts[headerIndex + 2] !== '-----') {
      header = `${header} ${parts[headerIndex + 2]}`;
    }
  }
  if (footer === '-----END' && parts[footerIndex + 1]) {
    footer = `${footer} ${parts[footerIndex + 1]}`;
    if (parts[footerIndex + 2] && parts[footerIndex + 2] !== '-----') {
      footer = `${footer} ${parts[footerIndex + 2]}`;
    }
  }
  
  // Join all content parts between header and footer, remove any remaining spaces
  const content = parts.slice(headerIndex + 3, footerIndex).join('').replace(/\s+/g, '');
  
  // Insert line breaks every 64 characters
  const formattedContent = content.replace(/(.{64})/g, '$1\n').trim();
  
  // Return the formatted PEM with proper line breaks
  return `${header}\n${formattedContent}\n${footer}`;
}

export class OpenAIConnector extends SubActionConnector<Config, Secrets> {
  private url: string;
  private provider: OpenAiProviderType;
  private key: string;
  private openAI: OpenAI;
  private headers: Record<string, string>;
  private configAny: any;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    // Top-level log to confirm constructor is called
    this.logger.info('OpenAIConnector constructed');

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
    this.configAny = this.config as any;
    this.logger.debug(`Provider: ${this.provider}, certificateFile: ${this.configAny.certificateFile}, certificateData: ${this.configAny.certificateData}, privateKeyFile: ${this.configAny.privateKeyFile}, privateKeyData: ${this.configAny.privateKeyData}`);

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
            this.configAny.certificateFile,
            this.configAny.certificateData,
            this.configAny.privateKeyFile,
            this.configAny.privateKeyData
          )
        ) {
          throw new Error('Invalid or inaccessible PKI certificates');
        }

        let cert: string | Buffer = '';
        let key: string | Buffer = '';

        if (this.configAny.certificateFile) {
          const fileContent = fs.readFileSync(
            Array.isArray(this.configAny.certificateFile)
              ? this.configAny.certificateFile[0]
              : this.configAny.certificateFile,
            'utf8'
          );
          cert = fileContent;
        } else if (this.configAny.certificateData) {
          // Format the certificate data properly
          cert = formatPEMContent(this.configAny.certificateData);
        }

        if (this.configAny.privateKeyFile) {
          const fileContent = fs.readFileSync(
            Array.isArray(this.configAny.privateKeyFile)
              ? this.configAny.privateKeyFile[0]
              : this.configAny.privateKeyFile,
            'utf8'
          );
          key = fileContent;
        } else if (this.configAny.privateKeyData) {
          // Format the private key data properly
          key = formatPEMContent(this.configAny.privateKeyData);
        }

        // Log the final PEM content for cert and key
        this.logger.info(`Final certificate PEM (first 200 chars):\n${cert?.toString().slice(0, 200)}`);
        this.logger.info(`Final private key PEM (first 200 chars):\n${key?.toString().slice(0, 200)}`);
        this.logger.info('Certificate PEM lines:\n' + cert?.toString().split('\n').join('\n'));
        this.logger.info('Private key PEM lines:\n' + key?.toString().split('\n').join('\n'));
        this.logger.debug(`Certificate format check - Header: ${cert?.toString().startsWith('-----BEGIN CERTIFICATE-----')}, Footer: ${cert?.toString().endsWith('-----END CERTIFICATE-----')}`);
        this.logger.debug(`Private key format check - Header: ${key?.toString().startsWith('-----BEGIN PRIVATE KEY-----')}, Footer: ${key?.toString().endsWith('-----END PRIVATE KEY-----')}`);

        // Pass PEM as Buffer
        cert = Buffer.from(cert.toString(), 'utf-8');
        key = Buffer.from(key.toString(), 'utf-8');

        const httpsAgent = new https.Agent({
          cert,
          key,
          rejectUnauthorized: this.configAny.verificationMode === 'none',
          checkServerIdentity:
            this.configAny.verificationMode === 'certificate' || this.configAny.verificationMode === 'none'
              ? () => undefined
              : undefined,
        });

        this.openAI = new OpenAI({
          apiKey: this.key,
          baseURL: removeEndpointFromUrl(this.url),
          defaultHeaders: this.headers,
          httpAgent: httpsAgent,
        });
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
      try {
        const sanitizedBody = JSON.parse(body);
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.configAny ? this.configAny.defaultModel : DEFAULT_OPENAI_MODEL),
          },
          {
            signal,
            timeout: timeout ?? DEFAULT_TIMEOUT_MS,
          }
        );
        this.logger.debug(`PKI OpenAI Response (runApi): ${JSON.stringify(response)}`);
        return response as RunActionResponse;
      } catch (error) {
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
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
      try {
        const sanitizedBody = JSON.parse(body);
        const response = await this.openAI.chat.completions.create(
          {
            ...sanitizedBody,
            model:
              sanitizedBody.model ??
              ('defaultModel' in this.configAny ? this.configAny.defaultModel : DEFAULT_OPENAI_MODEL),
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
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw new Error(
            `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`
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
