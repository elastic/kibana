/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import type {
  CreateRecordParams,
  PushToServiceApiParams,
  SwimlanePublicConfigurationType,
  SwimlaneSecretConfigurationType,
  UpdateRecordParams,
} from '@kbn/connector-schemas/swimlane';
export interface ExternalServiceCredentials {
  config: SwimlanePublicConfigurationType;
  secrets: SwimlaneSecretConfigurationType;
}

export interface ExternalServiceValidation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (configObject: any, validatorServices: ValidatorServices) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: (secrets: any, validatorServices: ValidatorServices) => void;
}

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}
export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  key: string;
  fieldType: string;
}

export interface SwimlaneRecordPayload {
  applicationId: string;
  values: SwimlaneDataValues;
  id?: string;
}

export interface ExternalService {
  createComment: (params: CreateCommentParams) => Promise<ExternalServiceCommentResponse>;
  createRecord: (params: CreateRecordParams) => Promise<ExternalServiceIncidentResponse>;
  updateRecord: (params: UpdateRecordParams) => Promise<ExternalServiceIncidentResponse>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

export interface GetApplicationHandlerArgs {
  externalService: ExternalService;
}

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ExternalServiceApi {
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<ExternalServiceIncidentResponse>;
}

export type SwimlaneExecutorResultData = ExternalServiceIncidentResponse;
export type SwimlaneDataValues = Record<string, string | number>;
export interface SwimlaneComment {
  fieldId: string;
  message: string | number;
  createdDate: string;
  isRichText: boolean;
}
export type SwimlaneDataComments = Record<string, SwimlaneComment[]>;

export interface SimpleComment {
  comment: SwimlaneComment['message'];
  commentId: string;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: SimpleComment;
  createdDate: string;
}

export interface ResponseError {
  ErrorCode: number;
  Argument: string;
}
