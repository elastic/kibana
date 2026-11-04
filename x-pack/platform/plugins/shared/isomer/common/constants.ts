/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The public route that materializes a saved object into an Isomer composition. */
export const MATERIALIZE_API_PATH = '/api/isomer/materialize';

/** The materialize route's only version. */
export const MATERIALIZE_API_VERSION = '2023-10-31';

/** Turns materialization on, in process and over HTTP. Off unless a provider or an override sets it. */
export const MATERIALIZE_FEATURE_FLAG = 'isomer.materializeEnabled';
