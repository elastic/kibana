/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Name of the datastream in elasticsearch
 */
export const DATA_STREAM_NAME = '.kibana_change_history';
/**
 * Name of the ILM policy applied to the change history data stream.
 * Documented in the package README so cluster admins can edit it via the
 * Kibana Index Lifecycle Management UI / Elasticsearch ILM API.
 */
export const ILM_POLICY_NAME = '.kibana-change-history-ilm-policy';
/**
 * Separator char. Used for scoping.
 */
export const SEPARATOR_CHAR = '|';
/**
 * The version of ECS used
 * @see https://www.elastic.co/docs/reference/ecs/ecs-field-reference
 */
export const ECS_VERSION = '9.3.0';
/**
 * The default size of results when getting history.
 */
export const DEFAULT_RESULT_SIZE = 100;

/**
 * Acts like a feature flag for this package as it prevents initialization.
 * Remove this after General Availability
 * */
export const FLAGS = {
  FEATURE_ENABLED: false,
};
