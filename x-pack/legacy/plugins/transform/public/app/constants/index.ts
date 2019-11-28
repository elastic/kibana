/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CLIENT_BASE_PATH = '/management/elasticsearch/transform';

export enum SECTION_SLUG {
  HOME = 'transform_management',
  CREATE_TRANSFORM = 'create_transform',
}

export enum TRANSFORM_DOC_PATHS {
  default = 'docs.html',
  plugins = 'plugins.html',
  transforms = 'transforms.html',
}

// UI Metric constants
export const UIM_APP_NAME = 'transform';
export const UIM_TRANSFORM_LIST_LOAD = 'transform_list_load';
export const UIM_TRANSFORM_CREATE = 'transform_create';
export const UIM_TRANSFORM_DELETE = 'transform_delete';
export const UIM_TRANSFORM_DELETE_MANY = 'transform_delete_many';
export const UIM_TRANSFORM_SHOW_DETAILS_CLICK = 'transform_show_details_click';
