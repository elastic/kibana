/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';

export const HelloWorldConfigSchema = schema.object({
  some_common_knowledge: schema.string(),
});

export const HelloWorldSecretsSchema = schema.object({
  weatherApiKey: schema.string(),
});

export type HelloWorldConfig = TypeOf<typeof HelloWorldConfigSchema>;
export type HelloWorldSecrets = TypeOf<typeof HelloWorldSecretsSchema>;

export type HelloWorldSecurityConnectorType = SubActionConnectorType<
  HelloWorldConfig,
  HelloWorldSecrets
>;

// Run action schema
export const HelloWorldRunActionParamsSchema = schema.object({
  question: schema.string(),
});

export const HelloWorldRunActionResponseSchema = schema.object(
  {
    answer: schema.string(),
  },
  { unknowns: 'ignore' }
);

export const HelloWorldWeatherActionParamsSchema = schema.object({
  city: schema.string(),
});

export const WeatherApiResponseSchema = schema.object(
  {
    current: schema.object(
      {
        temp_f: schema.number(),
        wind_mph: schema.number(),
        wind_dir: schema.string(),
        condition: schema.object({
          text: schema.string(),
          icon: schema.string(),
          code: schema.number(),
        }),
      },
      { unknowns: 'allow' }
    ),
  },
  { unknowns: 'allow' }
);

export const HelloWorldWeatherActionResponseSchema = schema.object(
  {
    weather: schema.string(),
  },
  { unknowns: 'ignore' }
);

export type HelloWorldRunActionParams = TypeOf<typeof HelloWorldRunActionParamsSchema>;
export type HelloWorldRunActionResponse = TypeOf<typeof HelloWorldRunActionResponseSchema>;
export type HelloWorldWeatherActionParams = TypeOf<typeof HelloWorldWeatherActionParamsSchema>;
export type HelloWorldWeatherActionResponse = TypeOf<typeof HelloWorldWeatherActionResponseSchema>;

export enum SUB_ACTION {
  RUN = 'run',
  TEST = 'test',
  WEATHER = 'weather',
}

export const HELLO_WORLD_CONNECTOR_ID = '.hello-world';
export const HELLO_WORLD_TITLE = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.connectorTypeTitle',
  {
    defaultMessage: 'HELLO WORLD',
  }
);
