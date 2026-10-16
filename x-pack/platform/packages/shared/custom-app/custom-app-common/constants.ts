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
export const MAX_QUERY_LENGTH = 10_000;
/** A template is markup with Liquid in it; a generated one is a few thousand characters. */
export const MAX_TEMPLATE_LENGTH = 40_000;
/** What a template is generated from: an instruction, not a description of the result. */
export const MAX_PROMPT_LENGTH = 10_000;
export const MAX_STATE_KEYS = 20;
export const MAX_STATE_KEY_LENGTH = 64;
export const MAX_STATE_STRING_LENGTH = 1_000;
export const MAX_ACTIONS_PER_EVENT = 5;
/** A workflow is named by its id, which is a text of this length at most. */
export const MAX_WORKFLOW_ID_LENGTH = 256;
/** What an action can hand to a workflow: a few named inputs, as a workflow declares few. */
export const MAX_WORKFLOW_INPUTS = 20;
export const MAX_WORKFLOW_INPUT_NAME_LENGTH = 64;
export const MAX_TABLE_COLUMNS = 50;
export const MAX_KEY_VALUE_FIELDS = 50;

/** ES|QL reserves these parameter names for the query's time range. */
export const RESERVED_STATE_KEYS: readonly string[] = ['_tstart', '_tend'];
export const MAX_INPUT_OPTIONS = 50;
export const MAX_BUTTON_GROUP_OPTIONS = 10;
