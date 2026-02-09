/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { AxiosError } from 'axios';
import type { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  API_MAX_RESULTS,
  SUB_ACTION,
  TinesStoriesActionParamsSchema,
  TinesWebhooksActionParamsSchema,
  TinesRunActionParamsSchema,
} from '@kbn/connector-schemas/tines';
import type {
  TinesConfig,
  TinesSecrets,
  TinesRunActionParams,
  TinesRunActionResponse,
  TinesStoriesActionResponse,
  TinesWebhooksActionParams,
  TinesWebhooksActionResponse,
  TinesWebhookObject,
  TinesStoryObject,
  TinesWebhookActionConfig,
} from '@kbn/connector-schemas/tines';
import {
  TinesStoriesApiResponseSchema,
  TinesWebhooksApiResponseSchema,
  TinesRunApiResponseSchema,
  TinesWebhookApiResponseSchema,
} from './api_schema';
import type {
  TinesBaseApiResponse,
  TinesStoriesApiResponse,
  TinesWebhookApiResponse,
  TinesWebhooksApiResponse,
} from './api_schema';

export const API_PATH = '/api/v1';
export const WEBHOOK_PATH = '/webhook';
export const WEBHOOK_AGENT_TYPE = 'Agents::WebhookAgent';

const storiesReducer = ({ stories }: TinesStoriesApiResponse) => ({
  stories: stories.map<TinesStoryObject>(({ id, name, published }) => ({ id, name, published })),
});

const webhooksReducer = ({ agents }: TinesWebhooksApiResponse) => ({
  webhooks: agents.reduce<TinesWebhookObject[]>(
    (webhooks, { id, type, name, story_id: storyId }) => {
      if (type === WEBHOOK_AGENT_TYPE) {
        webhooks.push({ id, name, storyId });
      }
      return webhooks;
    },
    []
  ),
});

export class TinesConnector extends SubActionConnector<TinesConfig, TinesSecrets> {
  private urls: {
    stories: string;
    agents: string;
    getActionUrl: (id: number) => string;
    getRunWebhookURL: (config: TinesWebhookActionConfig) => string;
  };

  constructor(params: ServiceParams<TinesConfig, TinesSecrets>) {
    super(params);

    this.logger = params.logger.get('tines');
    this.urls = {
      stories: `${this.config.url}${API_PATH}/stories`,
      agents: `${this.config.url}${API_PATH}/agents`,
      getActionUrl: (actionId) => `${this.config.url}${API_PATH}/actions/${actionId}`,
      getRunWebhookURL: (config) =>
        `${this.config.url}${WEBHOOK_PATH}/${config.path}/${config.secret}`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.STORIES,
      method: 'getStories',
      schema: TinesStoriesActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.WEBHOOKS,
      method: 'getWebhooks',
      schema: TinesWebhooksActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runWebhook',
      schema: TinesRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runWebhook',
      schema: TinesRunActionParamsSchema,
    });
  }

  private getAuthHeaders() {
    return { 'x-user-email': this.secrets.email, 'x-user-token': this.secrets.token };
  }

  private async tinesApiRequest<R extends TinesBaseApiResponse, T>(
    req: SubActionRequestParams<R>,
    reducer: (response: R) => T,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<T & { incompleteResponse: boolean }> {
    this.logger.debug(`[tinesApiRequest]. URL: ${req.url}`);
    const response = await this.request<R>(
      {
        ...req,
        params: { ...req.params, per_page: API_MAX_RESULTS },
      },
      connectorUsageCollector
    );
    return {
      ...reducer(response.data),
      incompleteResponse: response.data.meta.pages > 1,
    };
  }

  private async getWebhookParameters(
    webhook: TinesWebhookObject,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<TinesWebhookApiResponse> {
    const reqUrl = this.urls.getActionUrl(webhook.id);
    this.logger.debug(`[getWebhookParameters] URL: ${reqUrl}`);
    const response = await this.request(
      {
        url: reqUrl,
        method: 'get',
        headers: this.getAuthHeaders(),
        responseSchema: TinesWebhookApiResponseSchema,
      },
      connectorUsageCollector
    );

    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (error.response?.statusText) {
      return `API Error: ${error.response?.statusText}`;
    }
    return error.toString();
  }

  public async getStories(
    params: unknown,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<TinesStoriesActionResponse> {
    this.logger.debug(`[getStories] URL: ${this.urls.stories}`);
    return this.tinesApiRequest(
      {
        url: this.urls.stories,
        headers: this.getAuthHeaders(),
        responseSchema: TinesStoriesApiResponseSchema,
      },
      storiesReducer,
      connectorUsageCollector
    );
  }

  public async getWebhooks(
    { storyId }: TinesWebhooksActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<TinesWebhooksActionResponse> {
    this.logger.debug(`[getWebhooks] URL: ${this.urls.agents}, STORY_ID: ${storyId}`);
    return this.tinesApiRequest(
      {
        url: this.urls.agents,
        params: { story_id: storyId, action_type: WEBHOOK_AGENT_TYPE },
        headers: this.getAuthHeaders(),
        responseSchema: TinesWebhooksApiResponseSchema,
      },
      webhooksReducer,
      connectorUsageCollector
    );
  }

  public async runWebhook(
    { webhook, webhookUrl, body }: TinesRunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<TinesRunActionResponse> {
    if (!webhook && !webhookUrl) {
      throw Error('Invalid subActionsParams: [webhook] or [webhookUrl] expected but got none');
    }

    let webhookConfig;
    if (webhook && !webhookUrl) {
      const config = await this.getWebhookParameters(webhook, connectorUsageCollector);

      const parametersMatch =
        config.type === WEBHOOK_AGENT_TYPE &&
        config.id === webhook.id &&
        config.story_id === webhook.storyId;

      const expectedOptionsReturned = config.options.path && config.options.secret;

      if (!parametersMatch || !expectedOptionsReturned) {
        throw Error(
          `Invalid configuration for webhook id: ${webhook.id}. Verify webhook exists in Tines.`
        );
      }

      webhookConfig = config.options as TinesWebhookActionConfig;
    }

    const currentWebhookUrl = webhookUrl ? webhookUrl : this.urls.getRunWebhookURL(webhookConfig!);
    this.logger.debug(`[runWebhook] URL: ${currentWebhookUrl}`);
    const response = await this.request(
      {
        url: currentWebhookUrl,
        method: 'post',
        responseSchema: TinesRunApiResponseSchema,
        data: body,
      },
      connectorUsageCollector
    );
    return response.data;
  }
}
