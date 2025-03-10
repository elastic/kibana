/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExternalServiceIncidentResponseSchema,
  GetIncidentResponseSchema,
} from './schema';

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (configObject: any, validatorServices: ValidatorServices) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: (secrets: any, validatorServices: ValidatorServices) => void;
}

export type GetIncidentTypesResponse = Array<{ id: string; name: string }>;
export type GetSeverityResponse = Array<{ id: string; name: string }>;

export interface ExternalServiceFields {
  input_type: string;
  name: string;
  read_only: boolean;
  required?: string;
  text: string;
}
export type GetCommonFieldsResponse = ExternalServiceFields[];

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}

export interface UpdateFieldText {
  text: string;
}

export interface UpdateIdsField {
  ids: number[];
}
export interface UpdateIdField {
  id: number;
}

export interface UpdateFieldTextArea {
  textarea: { format: 'html' | 'text'; content: string };
}

interface UpdateField {
  field: { name: string };
  old_value: UpdateFieldText | UpdateFieldTextArea | UpdateIdsField | UpdateIdField;
  new_value: UpdateFieldText | UpdateFieldTextArea | UpdateIdsField | UpdateIdField;
}

export interface UpdateIncidentRequest {
  changes: UpdateField[];
}

export type GetValueTextContentResponse =
  | UpdateFieldText
  | UpdateFieldTextArea
  | UpdateIdsField
  | UpdateIdField;

export interface CreateIncidentData {
  name: string;
  discovered_date: number;
  description?: { format: string; content: string };
  incident_type_ids?: Array<{ id: number }>;
  severity_code?: { id: number };
}

export type ResilientConfig = TypeOf<typeof ExternalIncidentServiceConfigurationSchema>;
export type ResilientSecrets = TypeOf<typeof ExternalIncidentServiceSecretConfigurationSchema>;

export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;

export type ExternalServiceIncidentResponse = TypeOf<typeof ExternalServiceIncidentResponseSchema>;
export type GetIncidentResponse = TypeOf<typeof GetIncidentResponseSchema>;
