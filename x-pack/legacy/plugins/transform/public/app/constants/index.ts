/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/transform';
export const DEFAULT_SECTION: Section = 'transform_management';
export type Section = 'transform_management' | 'create_transform';

// Set a minimum request duration to avoid strange UI flickers
export const MINIMUM_TIMEOUT_MS = 300;

export enum TRANSFORM_DOC_PATHS {
  default = 'docs.html',
  plugins = 'plugins.html',
}

// UI Metric constants
export const UIM_APP_NAME = 'transform';
export const UIM_TRANSFORM_LIST_LOAD = 'transform_list_load';
export const UIM_TRANSFORM_CREATE = 'transform_create';
export const UIM_TRANSFORM_DELETE = 'transform_delete';
export const UIM_TRANSFORM_DELETE_MANY = 'transform_delete_many';
export const UIM_TRANSFORM_SHOW_DETAILS_CLICK = 'transform_show_details_click';
