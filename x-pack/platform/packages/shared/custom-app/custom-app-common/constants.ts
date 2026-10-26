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
/** A list holds a few values to look for, as many as a person can paste into a box. */
export const MAX_LIST_ITEMS = 1_000;
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
/** The most options a query can give a select, as many as a person can look through in one. */
export const MAX_QUERY_OPTIONS = 500;
/** What is added to the id of a select to name the source of its options, which is not a component. */
export const OPTIONS_SOURCE_SUFFIX = ':options';

/** What a filter of the cases a component shows can hold: a search text, a tag. */
export const MAX_CASES_FILTER_LENGTH = 256;
/** The most cases of a page, as many as the cases API gives at once. */
export const MAX_CASES_LIMIT = 100;
export const DEFAULT_CASES_LIMIT = 50;
export const CASES_STATUSES = ['open', 'in-progress', 'closed'] as const;
export const CASES_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const CASES_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'title',
  'severity',
  'status',
] as const;
/** The filters of a cases source that can be set from a value of the app, in the order they are shown. */
export const CASES_FILTERS = ['status', 'severity', 'search', 'tag'] as const;
export const MAX_BUTTON_GROUP_OPTIONS = 10;
/** The accents a page can have, a few named colours and not any colour, so that text stays readable. */
export const THEME_ACCENTS = ['blue', 'teal', 'purple', 'pink', 'orange', 'green', 'red'] as const;
/** How round the corners of a page are. */
export const THEME_SHAPES = ['soft', 'sharp'] as const;
/** A link to another page of Kibana: the longest path it can have, with its values in it. */
export const MAX_LINK_PATH_LENGTH = 500;
export const MAX_LINK_APP_ID_LENGTH = 100;
/** A form asks a few things; more than this is a page, not a form. */
export const MAX_FORM_FIELDS = 10;
