/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type KpiMetricIndex = 'cases' | 'activity' | 'attachments';
export type KpiFieldType = 'keyword' | 'numeric' | 'date';
export type KpiMetricFormat = 'number' | 'duration' | 'percent';
export type KpiMetricSource = 'caseSearch' | 'analytics';

export interface KpiFieldCatalogEntry {
  field: string;
  type: KpiFieldType;
  unit?: 's';
}

export interface PredefinedKpiMetric {
  id: string;
  label: string;
  format: KpiMetricFormat;
  source: KpiMetricSource;
}

export const KPI_FIELD_CATALOG: Record<KpiMetricIndex, readonly KpiFieldCatalogEntry[]> = {
  cases: [
    { field: 'case.status', type: 'keyword' },
    { field: 'case.severity', type: 'keyword' },
    { field: 'case.tags', type: 'keyword' },
    { field: 'case.category', type: 'keyword' },
    { field: 'case.assignees.full_name', type: 'keyword' },
    { field: 'case.assignees.username', type: 'keyword' },
    { field: 'case.template.id', type: 'keyword' },
    { field: 'case.created_by.username', type: 'keyword' },
    { field: 'case.closed_by.username', type: 'keyword' },
    { field: 'case.closed_by.full_name', type: 'keyword' },
    { field: 'case.duration', type: 'numeric', unit: 's' },
    { field: 'case.time_to_acknowledge', type: 'numeric', unit: 's' },
    { field: 'case.time_to_investigate', type: 'numeric', unit: 's' },
    { field: 'case.time_to_resolve', type: 'numeric', unit: 's' },
    { field: 'case.active_time_open', type: 'numeric', unit: 's' },
    { field: 'case.time_to_pickup', type: 'numeric', unit: 's' },
    { field: 'case.reopen_count', type: 'numeric' },
    { field: 'case.total_alerts', type: 'numeric' },
    { field: 'case.total_comments', type: 'numeric' },
    { field: 'case.total_events', type: 'numeric' },
    { field: 'case.total_observables', type: 'numeric' },
    { field: 'case.created_at', type: 'date' },
  ],
  activity: [
    { field: 'action.type', type: 'keyword' },
    { field: 'action.verb', type: 'keyword' },
    { field: 'action.status_new', type: 'keyword' },
    { field: 'action.severity_new', type: 'keyword' },
    { field: 'action.assignees_changed', type: 'keyword' },
    { field: 'action.tags_changed', type: 'keyword' },
    { field: 'source.type', type: 'keyword' },
    { field: 'actor.username', type: 'keyword' },
    { field: 'actor.full_name', type: 'keyword' },
    { field: 'case.id', type: 'keyword' },
  ],
  attachments: [
    { field: 'attachment.type', type: 'keyword' },
    { field: 'attachment.attachment_id', type: 'keyword' },
    { field: 'attachment.alert.rule.id', type: 'keyword' },
    { field: 'attachment.alert.rule.name', type: 'keyword' },
    { field: 'attachment.alert.indices', type: 'keyword' },
    { field: 'created_by.username', type: 'keyword' },
    { field: 'case.id', type: 'keyword' },
  ],
};

export const PREDEFINED_KPI_METRICS: readonly PredefinedKpiMetric[] = [
  {
    id: 'open_cases',
    label: 'Open cases',
    format: 'number',
    source: 'caseSearch',
  },
  {
    id: 'in_progress_cases',
    label: 'In progress cases',
    format: 'number',
    source: 'caseSearch',
  },
  {
    id: 'closed_cases',
    label: 'Closed cases',
    format: 'number',
    source: 'caseSearch',
  },
  {
    id: 'average_time_to_close',
    label: 'Average time to close',
    format: 'duration',
    source: 'caseSearch',
  },
];

export const PREDEFINED_KPI_METRIC_IDS = PREDEFINED_KPI_METRICS.map((metric) => metric.id);

/**
 * The result id of an unsaved metric in the preview
 */
export const KPI_METRIC_PREVIEW_ID = 'preview';

/**
 * The maximum number of cases that the case list filters can select for the custom metrics
 */
export const MAX_KPI_FILTER_CASE_IDS = 10000;

export const getKpiField = (
  index: KpiMetricIndex,
  field: string
): KpiFieldCatalogEntry | undefined =>
  KPI_FIELD_CATALOG[index].find((entry) => entry.field === field);

export const getPredefinedKpiMetric = (id: string): PredefinedKpiMetric | undefined =>
  PREDEFINED_KPI_METRICS.find((metric) => metric.id === id);
