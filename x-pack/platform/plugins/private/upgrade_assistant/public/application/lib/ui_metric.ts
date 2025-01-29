/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export const UIM_APP_NAME = 'upgrade_assistant';
export const UIM_ES_DEPRECATIONS_PAGE_LOAD = 'es_deprecations_page_load';
export const UIM_KIBANA_DEPRECATIONS_PAGE_LOAD = 'kibana_deprecations_page_load';
export const UIM_OVERVIEW_PAGE_LOAD = 'overview_page_load';
export const UIM_ES_DEPRECATION_LOGS_PAGE_LOAD = 'es_deprecation_logs_page_load';

// Reindexing
export const UIM_REINDEX_OPEN_FLYOUT_CLICK = 'reindex_open_flyout_click';
export const UIM_REINDEX_CLOSE_FLYOUT_CLICK = 'reindex_close_flyout_click';
export const UIM_REINDEX_START_CLICK = 'reindex_start_click';
export const UIM_REINDEX_STOP_CLICK = 'reindex_stop_click';
// Data Streams Reindexing
export const UIM_DATA_STREAM_REINDEX_OPEN_FLYOUT_CLICK = 'data_stream_reindex_open_flyout_click';
export const UIM_DATA_STREAM_REINDEX_CLOSE_FLYOUT_CLICK = 'data_stream_reindex_close_flyout_click';
export const UIM_DATA_STREAM_REINDEX_START_CLICK = 'data_stream_reindex_start_click';
export const UIM_DATA_STREAM_REINDEX_STOP_CLICK = 'data_stream_reindex_stop_click';

export const UIM_BACKUP_DATA_CLOUD_CLICK = 'backup_data_cloud_click';
export const UIM_BACKUP_DATA_ON_PREM_CLICK = 'backup_data_on_prem_click';
export const UIM_RESET_LOGS_COUNTER_CLICK = 'reset_logs_counter_click';
export const UIM_OBSERVABILITY_CLICK = 'observability_click';
export const UIM_DISCOVER_CLICK = 'discover_click';
export const UIM_ML_SNAPSHOT_UPGRADE_CLICK = 'ml_snapshot_upgrade_click';
export const UIM_ML_SNAPSHOT_DELETE_CLICK = 'ml_snapshot_delete_click';
export const UIM_INDEX_SETTINGS_DELETE_CLICK = 'index_settings_delete_click';
export const UIM_KIBANA_QUICK_RESOLVE_CLICK = 'kibana_quick_resolve_click';
export const UIM_CLUSTER_SETTINGS_DELETE_CLICK = 'cluster_settings_delete_click';

export class UiMetricService {
  private usageCollection: UsageCollectionSetup | undefined;

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(metricType: UiCounterMetricType, eventName: string | string[]) {
    if (!this.usageCollection) {
      // Usage collection might be disabled in Kibana config.
      return;
    }
    return this.usageCollection.reportUiCounter(UIM_APP_NAME, metricType, eventName);
  }

  public trackUiMetric(metricType: UiCounterMetricType, eventName: string | string[]) {
    return this.track(metricType, eventName);
  }
}

export const uiMetricService = new UiMetricService();
