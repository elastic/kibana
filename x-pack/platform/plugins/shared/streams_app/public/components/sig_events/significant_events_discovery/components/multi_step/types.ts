/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseRecord {
  _id: string;
  _index: string;
}

export interface DetectionSource {
  '@timestamp': string;
  rule_name: string;
  rule_uuid: string;
  stream: string;
  status: string;
  change_type?: Record<string, unknown>;
  alert_count: number;
  peak_30m_alert_count: number;
  detection_evidence?: { change_point_type?: string; p_value?: number };
  processed_by?: string;
  detection_id?: string;
  parent_detection_id?: string;
  workflow_execution_id?: string;
  alert_index?: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  protocol?: string;
  exposure?: 'exposed' | 'not_exposed';
}

export interface InfraComponent {
  title?: string;
  workloads?: string[];
  exposure?: 'exposed' | 'not_exposed';
}

export interface EmbeddedDetectionRef {
  detection_id?: string;
  rule_uuid?: string;
  rule_name?: string;
  stream_name?: string;
  detected_at?: string;
  event_count?: number;
  change_point_type?: string;
}

export interface DiscoverySource {
  '@timestamp': string;
  discovery_id: string;
  title: string;
  summary: string;
  status: string;
  review_context?: string;
  criticality: number;
  confidence: number;
  recommended_action?: string;
  rule_names: string[];
  stream_names: string[];
  detections?: EmbeddedDetectionRef[];
  conversation_id?: string;
  discovery_slug?: string;
  previous_discovery_id?: string;
  closes?: string | null;
  superseded_by_execution_id?: string;
  status_changed_reason?: string;
  workflow_execution_id?: string;
  dependency_edges?: DependencyEdge[];
  infra_components?: InfraComponent[];
}

export interface Evidence {
  rule_name?: string;
  stream_name?: string;
  description?: string;
  esql_query?: string;
  result?: string;
  row_count?: number;
  collected_at?: string;
  confirmed?: boolean;
}

export interface SigEventSource {
  '@timestamp': string;
  event_id?: string;
  verdict_id?: string;
  discovery_id?: string;
  discovery_slug?: string;
  verdict: string;
  title: string;
  summary?: string;
  root_cause?: string;
  rule_names: string[];
  stream_names: string[];
  criticality: number;
  recommended_action: string;
  impact?: string;
  recommendations?: string[];
  evidences?: Evidence[];
  grouped_into?: string;
  last_reviewed_at?: string;
}

export interface VerdictSource {
  '@timestamp': string;
  verdict_id?: string;
  discovery_id: string;
  discovery_slug?: string;
  title?: string;
  verdict: string;
  original_verdict?: string;
  criticality: number;
  confidence?: number;
  recommended_action: string;
  verdict_summary: string;
  assessment_note?: string;
  delta_reasoning?: string;
  cause_kis?: Array<{ name: string; stream_name: string }>;
  evidences?: Evidence[];
}

export type DiscoveryRow<TSource> = BaseRecord & TSource;

export type DetectionRow = DiscoveryRow<DetectionSource>;
export type DiscoveryItemRow = DiscoveryRow<DiscoverySource>;
export type SigEventRow = DiscoveryRow<SigEventSource>;
export type VerdictRow = DiscoveryRow<VerdictSource>;
