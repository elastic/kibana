/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../step_types/ki';
import type { KiTypeCount } from './ai_indices';
import type { KiReferenceRelation } from '../step_types/ki';

export interface KiListItem {
  id: string;
  index: string;
  type?: string;
  title?: string;
  updated_at?: string;
  expires_at?: string;
  lifecycle_status?: KiLifecycleStatus;
}

/** Unfiltered store stats. */
export interface KiListSummary {
  total: number;
  counts_by_type: KiTypeCount[];
}

export interface ListKisResponse {
  kis: KiListItem[];
  total: number;
  summary: KiListSummary;
}

export type KiJsonPrimitive = string | number | boolean | null;
export type KiJsonValue = KiJsonPrimitive | KiJsonValue[] | { [key: string]: KiJsonValue };

export interface KiDocumentProvenanceWriter {
  uri?: string;
  metadata?: Record<string, KiJsonValue>;
}

export interface KiDocumentGovernance {
  lifecycle?: {
    status?: string;
  };
  provenance?: {
    created_by?: KiJsonValue | KiDocumentProvenanceWriter;
    updated_by?: KiJsonValue | KiDocumentProvenanceWriter;
  };
}

export interface KiDocumentReference {
  uri?: string;
  relation?: KiReferenceRelation | string;
  description?: string;
}

export interface KiDocument {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  '@timestamp'?: string;
  updated_at?: string;
  expires_at?: string;
  attributes?: Record<string, KiJsonValue>;
  references?: KiDocumentReference[];
  governance?: KiDocumentGovernance;
}

export interface GetKiResponse {
  id: string;
  document: KiDocument;
}

export interface UpdateKiBody {
  ki: {
    content: string;
  };
}

export interface UpdateKiResponse {
  id: string;
  status: 'updated' | 'noop';
}

export interface DeleteKiResponse {
  id: string;
}

export interface RestoreKiResponse {
  id: string;
}
