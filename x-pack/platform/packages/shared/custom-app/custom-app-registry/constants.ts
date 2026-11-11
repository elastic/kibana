/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_NODE_ID_LENGTH = 64;
export const MAX_CHILDREN_PER_NODE = 50;
export const MAX_STATE_KEY_LENGTH = 64;
export const MAX_STATE_STRING_LENGTH = 1_000;
/** The names that ES|QL keeps for the time range, so a value of an app cannot have them. */
export const RESERVED_STATE_KEYS: readonly string[] = ['_tstart', '_tend'];
