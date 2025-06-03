/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import { IStorageClient } from '@kbn/storage-adapter';
import { z } from '@kbn/zod';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { changeRequestsStorageSettings } from './constants';

const apiRequestRt = z.object({
  // Do I add method and version here, what else is needed to run all requests?
  endpoint: z.string(),
  // Do these types need to be stricter?
  query: z.record(z.string(), z.any()).optional(),
  path: z.record(z.string(), z.any()).optional(),
  body: z.record(z.string(), z.any()).optional(),
  // I guess I don't really care here what any of this is, but on the client side
  // How can I make sure that the request the UI makes to submit this request still matches the API type of the target
  // endpoint if I'm using the route repository?
});

const requestWithMeta = z.object({
  request: apiRequestRt, // The request to perform if approved
  originApp: z.string(), // The Kibana app that this change applies to
  requiredPrivileges: z.array(z.string()),
});

export const submitRequestBodyRt = z.object({
  requests: z.array(requestWithMeta),
  title: z.string(),
  description: z.string(),
  urgency: z.union([z.literal('low'), z.literal('medium'), z.literal('high')]),
});

type SubmitRequestBody = z.TypeOf<typeof submitRequestBodyRt>;

export interface ChangeRequestDoc extends SubmitRequestBody {
  user: string;
  space: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  handledAt: string | undefined;
}

export type ChangeRequestsStorageSettings = typeof changeRequestsStorageSettings;
export type ChangeRequestsStorageClient = IStorageClient<
  ChangeRequestsStorageSettings,
  { request: ChangeRequestDoc }
>;

export interface ChangeRequestsRouteDependencies {
  getClients: () => Promise<{
    storageClient: ChangeRequestsStorageClient;
  }>;
  getStartServices: () => Promise<{
    core: CoreStart;
    security: SecurityPluginStart;
    spaces: SpacesPluginStart;
  }>;
}

export type ChangeRequestsRouteHandlerResources = ChangeRequestsRouteDependencies &
  DefaultRouteHandlerResources;
