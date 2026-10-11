/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreStatus, EntityType, ExtractionMode } from '.';
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
  lastExecutionTimestamp?: string;
  error?: EngineError | null;
  /** Present only for types with a priority extraction gate, with the dual-process flag on. */
  nonPriority?: NonPriorityEngineStatus;
}

export interface EngineError {
  message: string;
  action: 'init' | 'extractLogs';
}

export interface NonPriorityEngineStatus {
  status: EngineStatus | null;
  error: EngineError | null;
  lastExecutionTimestamp?: string;
  samplingRate: number | null;
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
  /** Set on extraction task components only. */
  extractionMode?: ExtractionMode;
  status?: string | null;
  runs?: number;
  lastError?: string | null;
}

export interface GetEntityStoreStatusResponse {
  status: EntityStoreStatus;
  engines: Array<EngineDescriptor & { components?: EngineComponentStatus[] }>;
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
