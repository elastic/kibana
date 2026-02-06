/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExternalServiceIncidentResponse,
  Incident,
  PushToServiceApiParams,
} from '@kbn/connector-schemas/cases_webhook';
import type { Logger } from '@kbn/core/server';

export interface ExternalServiceCredentials {
  config: CasesWebhookPublicConfigurationType;
  secrets: CasesWebhookSecretConfigurationType;
}

// incident service
export interface ExternalService {
  createComment: (params: CreateCommentParams) => Promise<unknown>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  getIncident: (id: string) => Promise<GetIncidentResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}
export interface CreateIncidentParams {
  incident: Incident;
}
export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}
export interface SimpleComment {
  comment: string;
  commentId: string;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: SimpleComment;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

// incident api
export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export interface GetIncidentResponse {
  id: string;
  title: string;
}

export interface ExternalServiceApi {
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
}
