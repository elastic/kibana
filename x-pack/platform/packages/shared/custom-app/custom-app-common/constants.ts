/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_APP_EMBEDDABLE_TYPE = 'custom_app';

/** Version of the stored panel state. Bump it, with an upgrade step, on any breaking change. */
export const CUSTOM_APP_STATE_VERSION = 1;

export const MAX_NODE_ID_LENGTH = 64;
export const MAX_NODE_COUNT = 200;
export const MAX_NODE_DEPTH = 8;
export const MAX_CHILDREN_PER_NODE = 50;
export const MAX_HEADING_LENGTH = 200;
export const MAX_TEXT_LENGTH = 5_000;
export const MAX_DATA_SOURCES = 20;
export const MAX_QUERY_LENGTH = 10_000;
export const MAX_STATE_KEYS = 20;
export const MAX_STATE_KEY_LENGTH = 64;
export const MAX_STATE_STRING_LENGTH = 1_000;
export const MAX_ACTIONS_PER_EVENT = 5;
export const MAX_TABLE_COLUMNS = 50;
export const MAX_KEY_VALUE_FIELDS = 50;

/** ES|QL reserves these parameter names for the query's time range. */
export const RESERVED_STATE_KEYS: readonly string[] = ['_tstart', '_tend'];
