/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'customApps';
export const PLUGIN_NAME = 'Custom Apps';

export const CUSTOM_APP_SAVED_OBJECT_TYPE = 'custom_app';

export const API_BASE_PATH = '/internal/custom_apps';

/** The bundled templates all query this sample data set. */
export const SAMPLE_DATA_SET_ID = 'logs';
export const SAMPLE_DATA_INDEX = 'kibana_sample_data_logs';

/**
 * Written by `scripts/k8s_otel_data.js`. The namespace suffix keeps the seed apart
 * from a real EDOT collector's `-default` data streams.
 */
export const K8S_POD_METRICS_INDEX = 'metrics-kubeletstatsreceiver.otel-k8sdemo';
export const K8S_CLUSTER_METRICS_INDEX = 'metrics-k8sclusterreceiver.otel-k8sdemo';
export const K8S_LOGS_INDEX = 'logs-k8s.otel-k8sdemo';
export const K8S_ALERTS_INDEX = 'k8sdemo_alert_status';

/** Grid settings, matching the dashboard's so apps feel the same to use. */
export const GRID_SETTINGS = {
  gutterSize: 8,
  rowHeight: 20,
  columnCount: 48,
  keyboardDragTopLimit: 150,
};

export const DEFAULT_PANEL_WIDTH = 24;
export const DEFAULT_PANEL_HEIGHT = 15;

/**
 * The only action events a custom app may dispatch. Anything else is rejected
 * so a generated document cannot reach arbitrary Kibana behaviour.
 */
export const ACTION_RUN_WORKFLOW = 'kbn.runWorkflow';
export const ACTION_NAVIGATE = 'kbn.navigate';
/** Writes a value into the dispatching panel's own data model. */
export const ACTION_SET_DATA = 'kbn.setData';
export const SUPPORTED_ACTIONS = [ACTION_RUN_WORKFLOW, ACTION_NAVIGATE, ACTION_SET_DATA] as const;

/**
 * Custom apps get their own navigation group rather than joining Analytics, so
 * apps a user builds sit apart from the stock Kibana ones. The order is below
 * Analytics (1000) so the group appears above it.
 */
export const CUSTOM_APPS_CATEGORY = {
  id: 'customApps',
  label: 'Custom apps',
  euiIconType: 'apps',
  order: 500,
} as const;
