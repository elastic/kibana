/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AxiosInstance } from 'axios';

export const ANOTHER_CONNECTOR = '.another-connector';

const meta = {
  id: ANOTHER_CONNECTOR,
  displayName: 'Single File Test Connector 2',
  icon: 'logoWebhook',
  description: 'Webhooks',
  docsUrl: 'https://www.elastic.co/guide/index.html',
} as const;

const ConfigSchema = z.object({
  url: z.string(),
  method: z.string(),
  headers: z.optional(z.record(z.string(), z.string())),
  hasAuth: z.boolean().default(true),
});

const AuthSchema = z.discriminatedUnion('authType', [
  z.object({
    authType: z.literal('basicAuth'),
    username: z.string().describe('username'),
    password: z.string().describe('password'),
  }),
]);

export const SUB_ACTION = {
  postMessage: 'postMessage',
} as const;

const Actions = {
  [SUB_ACTION.postMessage]: {
    paramsSchema: z.object({ foo: z.string(), bar: z.string() }),
    handler: async (axiosInstance: AxiosInstance, params: string) => {
      axiosInstance(params);
    },
  },
};

const test = (axiosInstance: AxiosInstance) =>
  axiosInstance({
    data: {
      sending: 'some webhook information',
    },
  });

export const anotherConnectorSchema = {
  ...meta,
  configSchema: ConfigSchema,
  authSchema: AuthSchema,
  actions: Actions,
  test,
};
