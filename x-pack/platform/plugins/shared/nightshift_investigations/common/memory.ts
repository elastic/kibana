/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MEMORY_AI_INDEX_ID = 'nightshift-semantic-memory';
export const MEMORY_AI_INDEX_DEST = 'ai-index-idx-nightshift-semantic-memory';

export type StoredMemoryStatus = 'established' | 'tentative' | 'archived';

/**
 * Standard Knowledge Indicator (KI) schema representing a Semantic Memory.
 */
export interface StoredMemoryPage {
  '@timestamp'?: string;
  type?: string;          // Always 'memory'
  title?: string;
  description?: string;
  content?: string;        // The Markdown memory content
  tags?: string[];         // Keywords
  search_embedding?: {
    type?: string;
    inference_id?: string;
  } | string;
  attributes: {
    status?: StoredMemoryStatus;
    impressions?: number;
    conversions?: number;
    last_impression_time?: string;
    categories?: string[];
    references?: string[];
    slug?: string;
    space_id?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    updated_by?: string;
  };
}

export interface MemoryPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  status: StoredMemoryStatus;
  space_id: string;
  categories: string[];
  references: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  telemetry: {
    impressions: number;
    conversions: number;
    last_impression_time: string;
  };
}

export interface MemoryStats {
  total: number;
  decayed_conversions: number;
  decayed_impressions: number;
}

export interface ListMemoryPagesResponse {
  pages: MemoryPage[];
  stats: MemoryStats;
}
