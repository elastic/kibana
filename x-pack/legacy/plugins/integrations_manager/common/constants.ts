/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import manifest from '../kibana.json';

export const PLUGIN_ID = manifest.id;
export const PLUGIN_VERSION = manifest.version;
export const SAVED_OBJECT_TYPE = 'integrations-manager';
export const API_ROOT = `/api/${PLUGIN_ID}`;
export const API_INTEGRATIONS_LIST = `${API_ROOT}/list`;
export const API_INTEGRATIONS_INFO = `${API_ROOT}/package/{pkgkey}`;
export const API_SAVED_OBJECTS_ROOT = `${API_ROOT}/saved_objects`;
export const API_SAVED_OBJECTS_DETAIL = `${API_ROOT}/saved_objects/{oid}`;
