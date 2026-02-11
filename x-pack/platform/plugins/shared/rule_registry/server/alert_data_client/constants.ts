/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The maximum number of alert groups to render
 */
export const DEFAULT_ALERTS_GROUP_BY_FIELD_SIZE = 10;

/**
 * Grouping pagination breaks if the field cardinality exceeds this number
 *
 * @external https://github.com/elastic/kibana/issues/151913
 */
export const MAX_ALERTS_GROUPING_QUERY_SIZE = 10000;

/**
 * The maximum number of addressable pages
 */
export const MAX_ALERTS_PAGES = 100;

/**
 * The maximum number of alerts to paginate
 */
export const MAX_PAGINATED_ALERTS = 10000;

/**
 * The maximum number of alerts to paginate
 */
export const MAX_ALERT_IDS_PER_REQUEST = 1000;

/**
 * The maximum number of tags to update in a single request
 */
export const MAX_TAGS_TO_UPDATE = 100;

/**
 * The maximum length of an index name as allowed by Elasticsearch
 */
export const MAX_INDEX_NAME = 255;

/**
 * The maximum length of a KQL query string
 */
export const MAX_QUERY_LENGTH = 10000;
