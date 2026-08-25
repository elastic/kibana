/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_AI_INDEX_ID = 'nightshift';
export const NIGHTSHIFT_AI_INDEX_DEST = 'ai-index-ds-nightshift';

export interface NightshiftKiBase {
  '@timestamp': string;
  id: string;
  type: 'feature' | 'query' | 'memory' | 'significant_event';
  title: string;
  description: string;
  tags?: string[];
  space_id: string;
  search_embedding?: string;
}

export interface NightshiftFeatureKi extends NightshiftKiBase {
  type: 'feature';
  'feature.type'?: string;
  'feature.slug'?: string;
  'feature.confidence'?: number;
}

export interface NightshiftQueryKi extends NightshiftKiBase {
  type: 'query';
  'query.esql'?: string;
  'query.severity_score'?: number;
  'query.rule_backed'?: boolean;
  'query.rule_id'?: string;
  'query.features'?: Array<{ id: string }>;
}

export interface NightshiftMemoryKi extends NightshiftKiBase {
  type: 'memory';
  'memory.content'?: string;
  'memory.name'?: string;
  'memory.categories'?: string[];
  'memory.references'?: string[];
}

export interface NightshiftSignificantEventKi extends NightshiftKiBase {
  type: 'significant_event';
  'significant_event.status'?: string;
  'significant_event.severity'?: string;
  'significant_event.stream_names'?: string[];
  'significant_event.event_id'?: string;
}

export type NightshiftKi =
  | NightshiftFeatureKi
  | NightshiftQueryKi
  | NightshiftMemoryKi
  | NightshiftSignificantEventKi;
