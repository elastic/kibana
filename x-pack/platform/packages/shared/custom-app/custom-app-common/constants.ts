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
