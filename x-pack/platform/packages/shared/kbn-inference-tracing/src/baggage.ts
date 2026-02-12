/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BAGGAGE_TRACKING_BEACON_KEY = 'kibana.inference.tracing';
export const BAGGAGE_TRACKING_BEACON_VALUE = '1';

/**
 * W3C baggage key used by offline eval runs to tag all inference spans with the current eval run id.
 *
 * This is intended to be set by clients (e.g. Scout/evals test runner) via the `baggage` HTTP header,
 * and then propagated through tracing context.
 */
export const EVAL_RUN_ID_BAGGAGE_KEY = 'kibana.evals.run_id';
