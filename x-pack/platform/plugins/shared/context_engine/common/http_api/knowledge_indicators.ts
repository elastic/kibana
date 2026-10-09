/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../step_types/ki';
import type { KiTypeCount } from './ai_indices';

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

export interface KiDocument {
  content?: string;
  description?: string;
  '@timestamp'?: string;
  updated_at?: string;
  expires_at?: string;
  tags?: string[];
  attributes?: KiJsonValue;
  governance?: KiJsonValue;
  [key: string]: KiJsonValue | undefined;
}

export interface GetKiResponse {
  id: string;
  document: KiDocument;
}
