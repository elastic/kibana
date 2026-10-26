/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'boost';

export const BOOST_SAVED_OBJECT_TYPE = 'boost_prototype';
export const BOOST_SETTINGS_SAVED_OBJECT_ID = 'boost-settings';
export const BOOST_SAMPLE_DATA_SAVED_OBJECT_ID = 'boost-sample-data';

export const BOOST_API_BASE_PATH = '/internal/boost';
export const BOOST_STATE_API_PATH = `${BOOST_API_BASE_PATH}/state`;
export const BOOST_DEFAULT_RULES_API_PATH = `${BOOST_API_BASE_PATH}/default_rules`;
export const BOOST_PROFILES_API_PATH = `${BOOST_API_BASE_PATH}/profiles`;
export const BOOST_RULES_API_PATH = `${BOOST_API_BASE_PATH}/rules`;
export const BOOST_EXPLAIN_API_PATH = `${BOOST_API_BASE_PATH}/explain`;
export const BOOST_SAMPLE_DATA_API_PATH = `${BOOST_API_BASE_PATH}/prototype/sample_data`;
export const BOOST_RESTORE_API_PATH = `${BOOST_API_BASE_PATH}/prototype/restore`;

export const READ_BOOST_PRIVILEGE = 'read_boost';
export const MANAGE_BOOST_PRIVILEGE = 'manage_boost';

// Bounds enforced by the Elasticsearch `_boost` API.
export const MIN_BOOST = 0;
export const MAX_BOOST = 5000;
