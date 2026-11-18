/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreStatus, EntityType } from '.';
import type { Entity } from './domain/definitions/entity.gen';

export type EngineStatus = 'installing' | 'started' | 'stopped' | 'updating' | 'error';

export interface EngineDescriptor {
  type: EntityType;
  indexPattern: string;
  status: EngineStatus;
  filter?: string;
  fieldHistoryLength: number;
  lookbackPeriod?: string;
  timestampField?: string;
  timeout?: string;
  frequency?: string;
  delay?: string;
  docsPerSecond?: number;
  maxLogsPerPage?: number;
  maxTimeWindowSize?: string;
  error?: { message: string; action: 'init' };
}

export type EngineComponentResource =
  | 'entity_engine'
  | 'entity_definition'
  | 'index'
  | 'data_stream'
  | 'component_template'
  | 'index_template'
  | 'ingest_pipeline'
  | 'enrich_policy'
  | 'task'
  | 'transform'
  | 'ilm_policy';

export interface EngineComponentStatus {
  id: string;
  installed: boolean;
  resource: EngineComponentResource;
  metadata?: Record<string, unknown>;
  health?: 'green' | 'yellow' | 'red' | 'unavailable' | 'unknown';
  errors?: Array<{ title?: string; message?: string }>;
  /** Task components only: the task's last run status, run count and last error. */
  status?: string | null;
  runs?: number;
  lastError?: string | null;
}

export interface GetEntityStoreStatusResponse {
  status: EntityStoreStatus;
  engines: Array<EngineDescriptor & { components?: EngineComponentStatus[] }>;
  excludedUserNames?: string[];
  historySnapshot?: {
    status: 'started' | 'stopped';
    frequency: string;
    retentionDays: number;
  };
}

export interface SetupSystemEventsResponse {
  installed: boolean;
  dashboardId?: string;
}

export interface InitEntityStoreResponse {
  succeeded?: boolean;
  engines?: EngineDescriptor[];
}

export interface InspectQuery {
  response: string[];
  dsl: string[];
}

export interface ListEntitiesResponse {
  records: Entity[];
  page: number;
  per_page: number;
  total: number;
  inspect?: InspectQuery;
}
