/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus, KiPartialFields } from '../step_types/ki';
import type { KiTypeCount } from './ai_indices';

export interface KiListItem {
  id: string;
  index: string;
  type?: string;
  title?: string;
  updatedAt?: string;
  lifecycleStatus?: KiLifecycleStatus;
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
  [key: string]: KiJsonValue;
}

export interface GetKiResponse {
  id: string;
  document: KiDocument;
}

export interface UpdateKiResponse {
  id: string;
  result: 'updated' | 'noop';
}

export interface DeleteKiResponse {
  id: string;
}

export type RestoreKiResponse = DeleteKiResponse;

export interface UpdateKiRequestBody {
  ki: KiPartialFields;
}
