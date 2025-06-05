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
  method: z.union([z.literal('post'), z.literal('put'), z.literal('patch'), z.literal('delete')]),
  endpoint: z.string(),
  version: z.string().optional(),
  query: z.record(z.string(), z.any()).optional(),
  path: z.record(z.string(), z.any()).optional(),
  body: z.record(z.string(), z.any()).optional(),
});

const requiredPrivilegesRt = z.object({
  kibana: z.array(z.string()).optional(), // based on security.authz.actions.X.get
  elasticsearch: z
    .object({
      cluster: z.array(z.string()),
      index: z.record(z.string(), z.array(z.string())),
    })
    .optional(),
});

export type RequiredPrivileges = z.TypeOf<typeof requiredPrivilegesRt>;

const actionRt = z.object({
  request: apiRequestRt,
  requiredPrivileges: requiredPrivilegesRt,
  label: z.string(), // These fields are filled out by the Kibana app, not the user
  summary: z.string(), // To explain for the admin the resources affected or the impact of this change
  originApp: z.string(), // The Kibana app that this change applies to
});

export const submitRequestBodyRt = z.object({
  actions: z.array(actionRt),
  urgency: z.union([z.literal('low'), z.literal('medium'), z.literal('high')]),
  title: z.string(), // User explanation of why this change is needed etc.
  description: z.string(),
});

export const statusRt = z.union([
  z.literal('pending'),
  z.literal('approved'),
  z.literal('applied'),
  z.literal('rejected'),
  z.literal('failed'),
  // Maybe in the future we'll also have a status like "exported" for GitOps
]);

export type Status = z.TypeOf<typeof statusRt>;

type SubmitRequestBody = z.TypeOf<typeof submitRequestBodyRt>;

export interface ChangeRequestDoc extends SubmitRequestBody {
  user: string;
  space: string;
  status: Status;
  submittedAt: string;
  lastUpdatedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
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
