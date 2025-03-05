/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The total number of of longtasks
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const METRIC_TRANSACTION_EXPERIENCE_LONGTASK_COUNT =
  'transaction.experience.longtask.count' as const;

/**
 * The max longtask duration
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const METRIC_TRANSACTION_EXPERIENCE_LONGTASK_MAX =
  'transaction.experience.longtask.max' as const;

/**
 * The sum of longtask durations
 *
 * @see https://www.elastic.co/guide/en/integrations/current/apm.html#apm-traces
 */
export const METRIC_TRANSACTION_EXPERIENCE_LONGTASK_SUM =
  'transaction.experience.longtask.sum' as const;
