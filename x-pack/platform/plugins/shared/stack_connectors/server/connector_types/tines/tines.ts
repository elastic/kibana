/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { AxiosError } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  TinesStoriesActionParamsSchema,
  TinesWebhooksActionParamsSchema,
  TinesRunActionParamsSchema,
} from '../../../common/tines/schema';
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
} from '../../../common/tines/types';
import {
  TinesStoriesApiResponseSchema,
  TinesWebhooksApiResponseSchema,
  TinesRunApiResponseSchema,
} from './api_schema';
import type {
  TinesBaseApiResponse,
  TinesStoriesApiResponse,
  TinesWebhooksApiResponse,
} from './api_schema';
import { API_MAX_RESULTS, SUB_ACTION } from '../../../common/tines/constants';

export const API_PATH = '/api/v1';
export const WEBHOOK_PATH = '/webhook';
export const WEBHOOK_AGENT_TYPE = 'Agents::WebhookAgent';

const storiesReducer = ({ stories }: TinesStoriesApiResponse) => ({
  stories: stories.map<TinesStoryObject>(({ id, name, published }) => ({ id, name, published })),
});

const webhooksReducer = ({ agents }: TinesWebhooksApiResponse) => ({
  webhooks: agents.reduce<TinesWebhookObject[]>(
    (webhooks, { id, type, name, story_id: storyId, options: { path = '', secret = '' } }) => {
      if (type === WEBHOOK_AGENT_TYPE) {
        webhooks.push({ id, name, path, secret, storyId });
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
    getRunWebhookURL: (webhook: TinesWebhookObject) => string;
  };

  constructor(params: ServiceParams<TinesConfig, TinesSecrets>) {
    super(params);

    this.urls = {
      stories: `${this.config.url}${API_PATH}/stories`,
      agents: `${this.config.url}${API_PATH}/agents`,
      getRunWebhookURL: (webhook) =>
        `${this.config.url}${WEBHOOK_PATH}/${webhook.path}/${webhook.secret}`,
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
    return this.tinesApiRequest(
      {
        url: this.urls.agents,
        params: { story_id: storyId },
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
    const response = await this.request(
      {
        url: webhookUrl ? webhookUrl : this.urls.getRunWebhookURL(webhook!),
        method: 'post',
        responseSchema: TinesRunApiResponseSchema,
        data: body,
      },
      connectorUsageCollector
    );
    return response.data;
  }
}
