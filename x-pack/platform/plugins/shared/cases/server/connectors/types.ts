/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Case, CaseStatuses, ConnectorMappings } from '../../common/types/domain';
import type { CasesClientGetAlertsResponse } from '../client/alerts/types';
import type { CasesClientFactory } from '../client/factory';
import type { RegisterActionType } from '../types';

export interface GetActionTypeParams {
  logger: Logger;
  factory: CasesClientFactory;
}

export interface RegisterConnectorsArgs extends GetActionTypeParams {
  registerActionType: RegisterActionType;
}

/**
 * Case fields read back from the external incident. A missing key means the
 * incident carries no usable value for that field.
 */
export interface ExternalIncidentSnapshot {
  title?: string;
  description?: string;
  status?: CaseStatuses;
  updatedAt?: string;
  updatedBy?: string;
}

export type ParseIncident = (incident: Record<string, unknown>) => ExternalIncidentSnapshot;

export interface ICasesConnector<TExternalServiceParams = {}> {
  format: (theCase: Case, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
  getMapping: () => ConnectorMappings;
  /** Maps a `getIncident` response to case fields. Absent when the type cannot be synced from. */
  parseIncident?: ParseIncident;
}

export interface CasesConnectorsMap {
  get: (type: string) => ICasesConnector | undefined | null;
}
