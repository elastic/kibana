/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AxiosError } from 'axios';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import type { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { FederatedConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import { CONNECTOR_ID, CONNECTOR_NAME, SUB_ACTION } from '../../../common/notion/constants';
import type {
  NotionConfig,
  NotionConnectorType,
  NotionGetDataSourceActionParams,
  NotionGetDataSourceActionResponse,
  NotionGetPageActionParams,
  NotionQueryActionParams,
  NotionSearchActionParams,
  NotionSecrets,
} from '../../../common/notion/types';
import {
  NotionConfigSchema,
  NotionGetDataSourceActionParamsSchema,
  NotionGetDataSourceActionResponseSchema,
  NotionGetPageActionParamsSchema,
  NotionGetPageActionResponseSchema,
  NotionQueryActionParamsSchema,
  NotionQueryActionResponseSchema,
  NotionSearchActionParamsSchema,
  NotionSearchActionResponseSchema,
  NotionSecretsSchema,
} from '../../../common/notion/schema';
import type { ExecutorParams } from '../../../common/xsoar/types';

export class NotionConnector extends SubActionConnector<NotionConfig, NotionSecrets> {
  constructor(params: ServiceParams<NotionConfig, NotionSecrets>) {
    super(params);

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.SEARCH,
      method: 'searchPage',
      schema: NotionSearchActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_PAGE,
      method: 'getPage',
      schema: NotionGetPageActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_DATA_SOURCE,
      method: 'getDataSource',
      schema: NotionGetDataSourceActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.QUERY_DATA_SOURCE,
      method: 'queryDataSource',
      schema: NotionQueryActionParamsSchema,
    });
  }

  public async searchPage(
    params: NotionSearchActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    // https://developers.notion.com/reference/post-search
    const requestData = {
      query: params.query,
      filter: {
        value: params.queryObjectType,
        property: 'object',
      },
      ...(params.startCursor && { start_cursor: params.startCursor }),
      ...(params.pageSize && { page_size: params.pageSize }),
    };
    const response = await this.request(
      {
        url: `https://api.notion.com/v1/search`,
        method: 'post',
        responseSchema: NotionSearchActionResponseSchema,
        headers: {
          'Notion-Version': '2025-09-03',
          Authorization: `Bearer ${this.secrets.token}`,
        },
        data: requestData,
      },
      connectorUsageCollector
    );
    return response.data;
  }

  public async getPage(
    { pageId }: NotionGetPageActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    // https://developers.notion.com/reference/retrieve-a-page
    const response = await this.request(
      {
        url: `https://api.notion.com/v1/pages/${pageId}`,
        method: 'get',
        responseSchema: NotionGetPageActionResponseSchema,
        headers: {
          'Notion-Version': '2025-09-03',
          Authorization: `Bearer ${this.secrets.token}`,
        },
      },
      connectorUsageCollector
    );
    return response.data;
  }

  public async getDataSource(
    { dataSourceId }: NotionGetDataSourceActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<NotionGetDataSourceActionResponse> {
    // https://developers.notion.com/reference/retrieve-a-data-source
    // consider { unknowns: 'ignore' } and { unknowns: 'allow' }
    const response = await this.request(
      {
        url: `https://api.notion.com/v1/data_sources/${dataSourceId}`,
        method: 'get',
        responseSchema: NotionGetDataSourceActionResponseSchema,
        headers: {
          'Notion-Version': '2025-09-03',
          Authorization: `Bearer ${this.secrets.token}`,
        },
      },
      connectorUsageCollector
    );
    return response.data;
  }

  public async queryDataSource(
    params: NotionQueryActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    // https://developers.notion.com/reference/query-a-data-source
    let requestData = {};
    if (params.filter) {
      requestData = { filter: params.filter };
    }
    const response = await this.request(
      {
        url: `https://api.notion.com/v1/data_sources/${params.dataSourceId}/query`,
        method: 'post',
        responseSchema: NotionQueryActionResponseSchema,
        headers: {
          'Notion-Version': '2025-09-03',
          Authorization: `Bearer ${this.secrets.token}`,
        },
        data: requestData,
      },
      connectorUsageCollector
    );
    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    return error.toString();
  }
}

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  return {
    ...params,
    subActionParams: {
      ...params.subActionParams,
      body: renderMustacheString(logger, params.subActionParams.body as string, variables, 'json'),
    },
  };
};

export function getConnectorType(): NotionConnectorType {
  return {
    id: CONNECTOR_ID,
    name: CONNECTOR_NAME,
    minimumLicenseRequired: 'gold',
    getService: (params) => new NotionConnector(params),
    supportedFeatureIds: [FederatedConnectorFeatureId],
    schema: {
      config: NotionConfigSchema,
      secrets: NotionSecretsSchema,
    },
    renderParameterTemplates,
  };
}
