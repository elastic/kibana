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

export interface ExternalIncidentComment {
  externalId: string;
  body: string;
  author?: { name: string; email?: string };
  createdAt?: string;
}

/**
 * Case fields read back from the external incident. A missing key means the
 * incident carries no usable value for that field.
 */
export interface ExternalIncidentSnapshot {
  title?: string;
  description?: string;
  status?: CaseStatuses;
  /** Labels or equivalent; absent when the system has no tag concept. */
  tags?: string[];
  /** Every comment on the incident; the engine decides which ones are new. */
  comments?: ExternalIncidentComment[];
  updatedAt?: string;
  updatedBy?: string;
}

export type ParseIncident = (incident: Record<string, unknown>) => ExternalIncidentSnapshot;

/** The incident a change notification from the external system is about. */
export interface ExternalIncidentNotification {
  /** The incident id, as recorded on the case by a push. */
  externalId: string;
  /** When the incident changed, as the external system reports it. */
  updatedAt?: string;
}

/** Reads a change notification sent by the external system; `null` when the body is not one. */
export type ParseNotification = (body: unknown) => ExternalIncidentNotification | null;

export interface ICasesConnector<TExternalServiceParams = {}> {
  format: (theCase: Case, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
  getMapping: () => ConnectorMappings;
  /** Maps a `getIncident` response to case fields. Absent when the type cannot be synced from. */
  parseIncident?: ParseIncident;
  /** Reads change notifications the external system sends to Kibana. Absent when it cannot send them. */
  parseNotification?: ParseNotification;
  /**
   * Push payload key that accepts arbitrary external fields as a JSON string. Mapped case
   * fields are written through it; absent when the connector has no such channel.
   */
  freeFormFieldsKey?: string;
}

export interface CasesConnectorsMap {
  get: (type: string) => ICasesConnector | undefined | null;
}
