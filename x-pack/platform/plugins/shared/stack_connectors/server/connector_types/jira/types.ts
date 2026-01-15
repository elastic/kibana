/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import type {
  CreateCommentParams,
  CreateIncidentParams,
  ExecutorSubActionCommonFieldsParams,
  ExecutorSubActionGetFieldsByIssueTypeParams,
  ExecutorSubActionGetIncidentParams,
  ExecutorSubActionGetIssueParams,
  ExecutorSubActionGetIssuesParams,
  ExecutorSubActionHandshakeParams,
  ExternalServiceCommentResponse,
  ExternalServiceIncidentResponse,
  ExternalServiceParams,
  GetCommonFieldsResponse,
  GetFieldsByIssueTypeResponse,
  GetIssueResponse,
  GetIssueTypesResponse,
  GetIssuesResponse,
  PushToServiceApiParams,
  PushToServiceResponse,
  UpdateIncidentParams,
} from '@kbn/connector-schemas/jira';

export interface ExternalServiceValidation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (configObject: any, validatorServices: ValidatorServices) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: (secrets: any, validatorServices: ValidatorServices) => void;
}

export interface ExternalService {
  createComment: (params: CreateCommentParams) => Promise<ExternalServiceCommentResponse>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  getFields: () => Promise<GetCommonFieldsResponse>;
  getFieldsByIssueType: (issueTypeId: string) => Promise<GetFieldsByIssueTypeResponse>;
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  getIssue: (id: string) => Promise<GetIssueResponse>;
  getIssues: (title: string) => Promise<GetIssuesResponse>;
  getIssueTypes: () => Promise<GetIssueTypesResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}

export interface GetIncidentApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetIncidentParams;
}

export interface HandshakeApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionHandshakeParams;
}

export interface GetIssueTypesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetCommonFieldsHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetFieldsByIssueTypeHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetFieldsByIssueTypeParams;
}

export interface GetIssuesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIssuesParams;
}

export interface GetIssueHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIssueParams;
}

export interface ExternalServiceApi {
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<ExternalServiceParams | undefined>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  issueTypes: (args: GetIssueTypesHandlerArgs) => Promise<GetIssueTypesResponse>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  fieldsByIssueType: (
    args: GetFieldsByIssueTypeHandlerArgs
  ) => Promise<GetFieldsByIssueTypeResponse>;
  issue: (args: GetIssueHandlerArgs) => Promise<GetIssueResponse>;
  issues: (args: GetIssuesHandlerArgs) => Promise<GetIssuesResponse>;
}

export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}
