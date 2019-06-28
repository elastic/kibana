/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/snapshot_restore';
export const DEFAULT_SECTION: Section = 'repositories';
export type Section = 'repositories' | 'snapshots';

// Set a minimum request duration to avoid strange UI flickers
export const MINIMUM_TIMEOUT_MS = 300;

export enum REPOSITORY_DOC_PATHS {
  default = 'modules-snapshots.html',
  fs = 'modules-snapshots.html#_shared_file_system_repository',
  url = 'modules-snapshots.html#_read_only_url_repository',
  source = 'modules-snapshots.html#_source_only_repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
  plugins = 'repository.html',
}

export enum SNAPSHOT_STATE {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  INCOMPATIBLE = 'INCOMPATIBLE',
}

// UI Metric constants
export const UIM_APP_NAME = 'snapshot_restore';
export const UIM_REPOSITORY_LIST_LOAD = 'repository_list_load';
export const UIM_REPOSITORY_CREATE = 'repository_create';
export const UIM_REPOSITORY_UPDATE = 'repository_update';
export const UIM_REPOSITORY_DELETE = 'repository_delete';
export const UIM_REPOSITORY_DELETE_MANY = 'repository_delete_many';
export const UIM_REPOSITORY_SHOW_DETAILS_CLICK = 'repository_show_details_click';
export const UIM_REPOSITORY_DETAIL_PANEL_VERIFY = 'repository_detail_panel_verify';
export const UIM_SNAPSHOT_LIST_LOAD = 'snapshot_list_load';
export const UIM_SNAPSHOT_SHOW_DETAILS_CLICK = 'snapshot_show_details_click';
export const UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB = 'snapshot_detail_panel_summary_tab';
export const UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB =
  'snapshot_detail_panel_failed_indices_tab';
