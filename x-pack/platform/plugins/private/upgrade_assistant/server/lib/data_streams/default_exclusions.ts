/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These are the default exclusions for data streams.
 *
 * They are used to exclude data streams from getting certain corrective actions.
 * This is needed to avoid breaking certain built-in/system functionality that might rely on writing to these data streams.
 *
 * These indices can be overridden by the user in the Kibana configuration:
 *
 * For Example this will renenable all corrective actions for the siem-signals data stream:
 * xpack.upgrade_assistant.dataStreamExclusions:
 *    '.siem-signals*': []
 */
export const defaultExclusions = {
  '.siem-signals*': ['readOnly'],
  '.alerts*': ['readOnly'],
  '.internal.alerts*': ['readOnly'],
  '.preview.alerts*': ['readOnly'],
  '.internal.preview.alerts*': ['readOnly'],
  '.lists-*': ['readOnly'],
  '.items-*': ['readOnly'],
  '.logs-endpoint.actions-*': ['readOnly'],
  '.logs-endpoint.action.responses-*': ['readOnly'],
  '.metrics-endpoint.metadata_united_default': ['readOnly'],
  '.logs-osquery_manager.actions-*': ['readOnly'],
  '.logs-osquery_manager.action.responses-*': ['readOnly'],
  '.logs-endpoint.diagnostic.collection-*': ['readOnly'],
  'kibana_sample_data_*': ['readOnly'],
  '.ent-search*': ['readOnly'],
  'monitoring-ent-search-*': ['readOnly'],
  'app-search-*': ['readOnly'],
  'metricbeat-ent-search-*': ['readOnly'],
  'enterprise-search-*': ['readOnly'],
  'elastic-analytics-collections': ['readOnly'],
  '.elastic-connectors*': ['readOnly'],
  'logs-elastic_analytics.events-*': ['readOnly'],
};
