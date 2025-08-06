/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector } from '@kbn/actions-plugin/server';
import { FederatedConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { AxiosError } from 'axios';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import type { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import type {
  HelloWorldConfig,
  HelloWorldSecrets,
  HelloWorldRunActionParams,
  HelloWorldRunActionResponse,
  HelloWorldWeatherActionParams,
  HelloWorldWeatherActionResponse,
  HelloWorldSecurityConnectorType,
} from '../../../common/hello_world/everything';
import {
  SUB_ACTION,
  HelloWorldRunActionParamsSchema,
  HelloWorldWeatherActionParamsSchema,
  WeatherApiResponseSchema,
  HELLO_WORLD_CONNECTOR_ID,
  HELLO_WORLD_TITLE,
  HelloWorldConfigSchema,
  HelloWorldSecretsSchema,
} from '../../../common/hello_world/everything';

export class HelloWorldConnector extends SubActionConnector<HelloWorldConfig, HelloWorldSecrets> {
  private some_common_knowledge;
  private weatherApiKey;

  constructor(params: ServiceParams<HelloWorldConfig, HelloWorldSecrets>) {
    super(params);

    this.some_common_knowledge = this.config.some_common_knowledge;
    this.weatherApiKey = this.secrets.weatherApiKey;

    this.registerSubActions();
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.status} - ${error.response?.statusText}`;
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: HelloWorldRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApiTest',
      schema: HelloWorldRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.WEATHER,
      method: 'weatherApi',
      schema: HelloWorldWeatherActionParamsSchema,
    });
  }

  public async runApi(
    { question }: HelloWorldRunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<HelloWorldRunActionResponse> {
    return {
      answer: "Sorry, I don't really understand your question. Can you re-phrase and try again?",
    };
  }

  public async runApiTest(
    { question }: HelloWorldRunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<HelloWorldRunActionResponse> {
    return {
      answer: `Your question was: ${question}. It's a little too generic, can you be more specific?`,
    };
  }

  public async weatherApi(
    { city }: HelloWorldWeatherActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<HelloWorldWeatherActionResponse> {
    const response = await this.request(
      {
        url: `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${city}&aqi=no`,
        method: 'get',
        responseSchema: WeatherApiResponseSchema,
      },
      connectorUsageCollector
    );

    const data = response.data.current;

    return {
      weather: `Temperature in ${city} is ${data.temp_f} Fahrenheit. Wind is ${data.wind_dir} ${data.wind_mph} miles per hour. Overall consition is ${data.condition.text}.\nSome common knowledge for you: ${this.some_common_knowledge}`,
    };
  }
}

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  if (params?.subAction !== SUB_ACTION.RUN && params?.subAction !== SUB_ACTION.TEST) return params;

  return {
    ...params,
    subActionParams: {
      ...params.subActionParams,
      body: renderMustacheString(logger, params.subActionParams.body as string, variables, 'json'),
    },
  };
};

export function getConnectorType(): HelloWorldSecurityConnectorType {
  return {
    id: HELLO_WORLD_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: HELLO_WORLD_TITLE,
    getService: (params) => new HelloWorldConnector(params),
    supportedFeatureIds: [FederatedConnectorFeatureId],
    schema: {
      config: HelloWorldConfigSchema,
      secrets: HelloWorldSecretsSchema,
    },
    renderParameterTemplates,
  };
}
