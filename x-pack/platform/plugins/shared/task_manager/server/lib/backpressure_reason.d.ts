/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The category of Elasticsearch-pressure error that makes Task Manager back off (reduce capacity / lengthen the poll interval). */
export type BackpressureReason =
  | 'cluster_block'
  | 'too_many_requests'
  | 'es_unavailable'
  | 'script_error'
  | 'msearch_5xx'
  | 'bulk_5xx'
  | 'general_error';
/** Classifies an error into the backpressure reason it triggers, or `null` if Task Manager would not back off (checked most- to least-specific). */
export declare function getBackpressureReason(error: Error): BackpressureReason | null;
