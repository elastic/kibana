/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_CUSTOM_APP_ACTION_ID = 'ADD_CUSTOM_APP_PANEL';
export const VIEW_CUSTOM_APP_SOURCE_ACTION_ID = 'VIEW_CUSTOM_APP_SOURCE';

/** The saved object type of an app in the library, which is also what a standalone app opens. */
export const CUSTOM_APP_SAVED_OBJECT_TYPE = 'custom_app';
/** The id of the Kibana feature whose privileges govern saved apps. */
export const CUSTOM_APP_FEATURE_ID = 'customApp';
export const MAX_APP_TITLE_LENGTH = 256;
export const MAX_APP_DESCRIPTION_LENGTH = 2_000;
