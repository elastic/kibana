/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hash of select properties of the logged error for grouping purposes.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_GROUPING_KEY = 'error.grouping_key' as const;

/**
 * The original error message.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_EXCEPTION_MESSAGE = 'error.exception.message' as const;

/**
 * The type of the original error, e.g. the Java exception class name.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-application-errors
 */
export const ATTR_ERROR_EXCEPTION_TYPE = 'error.exception.type' as const;

/**
 * ISO country code, eg. US
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const ATTR_NETWORK_CARRIER_ICC = 'network.carrier.icc' as const;

/**
 * Carrier name, eg. Vodafone, T-Mobile, etc.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const ATTR_NETWORK_CARRIER_NAME = 'network.carrier.name' as const;

/**
 * Network connection type, eg. "wifi", "cell"
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const ATTR_NETWORK_CONNECTION_TYPE = 'network.connection.type' as const;

/**
 * Processor event.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/span.json
 */
export const ATTR_PROCESSOR_EVENT = 'processor.event' as const;

export const PROCESSOR_EVENT_VALUE_ERROR = 'error' as const;
export const PROCESSOR_EVENT_VALUE_METRIC = 'metric' as const;
export const PROCESSOR_EVENT_VALUE_TRANSACTION = 'transaction' as const;

/**
 * Total duration of this transaction, in microseconds.
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_DURATION_US = 'transaction.duration.us' as const;

/**
 * Generic designation of a transaction in the scope of a single service (eg. GET /users/:id).
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_NAME = 'transaction.name' as const;

/**
 * Keyword of specific relevance in the service’s domain (eg. request, backgroundjob, etc)
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 * @see https://github.com/elastic/apm-data/blob/main/input/elasticapm/docs/spec/v2/transaction.json
 */
export const ATTR_TRANSACTION_TYPE = 'transaction.type' as const;

// This is used in the UX plugin
export const ATTR_TRANSACTION_URL = 'transaction.url' as const;

/**
 * Stacktrace ids from profiling.
 *
 * Only defined in the transaction proto and here.
 *
 * @see https://github.com/elastic/apm-data/blob/main/model/proto/transaction.proto
 */
export const ATTR_TRANSACTION_PROFILER_STACK_TRACE_IDS =
  'transaction.profiler_stack_trace_ids' as const;

// These are used in the UX plugin
export const ATTR_NUMERIC_LABELS_INP_VALUE = 'numeric_labels.inp_value' as const;
export const ATTR_TRANSACTION_EXPERIENCE = 'transaction.experience' as const;
export const ATTR_TRANSACTION_EXPERIENCE_CLS = 'transaction.experience.cls' as const;
export const ATTR_TRANSACTION_EXPERIENCE_FID = 'transaction.experience.fid' as const;
export const ATTR_TRANSACTION_EXPERIENCE_TBT = 'transaction.experience.tbt' as const;

// These marks fields are used by the ux plugin.
// see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
export const ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT =
  'transaction.marks.agent.firstContentfulPaint' as const;
export const ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT =
  'transaction.marks.agent.largestContentfulPaint' as const;
export const ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE =
  'transaction.marks.agent.timeToFirstByte' as const;
export const ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START =
  'transaction.marks.navigationTiming.fetchStart' as const;
