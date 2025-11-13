/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AxiosInstance } from 'axios';

export const NEW_SLACK_CONNECTOR = '.new-slack';

const meta = {
  id: NEW_SLACK_CONNECTOR,
  displayName: 'Single File Connector Test 1',
  icon: 'logoSlack',
  description: 'Slack Web API & Incoming Webhooks',
  docsUrl: 'https://api.slack.com/',
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
  z.object({
    authType: z.literal('Authorization'),
    bearerToken: z.string().describe('Bearer <token>'),
  }),
]);

export const SUB_ACTION = {
  postMessage: 'postMessage',
  // getChannels: 'getChannels',
  // getUsers: 'getUsers',
  // searchChannels: 'searchChannels',
} as const;

const Actions = {
  [SUB_ACTION.postMessage]: {
    paramsSchema: z.object({ foo: z.string(), bar: z.string() }),
    handler: async (axiosInstance: AxiosInstance, params: string) => {
      // validateParamsAgainstSchema();
      axiosInstance(params);
    },
  },
};

const test = (axiosInstance: AxiosInstance) =>
  axiosInstance({
    data: {
      sending: 'some data',
    },
  });

export const newSlackConnectorSchema = {
  ...meta,
  configSchema: ConfigSchema,
  authSchema: AuthSchema,
  actions: Actions,
  test,
};
