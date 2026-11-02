/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Light public entry for the task pod: it does not pull in the host (core-di internals, saved
 * objects, the HTTP server) until `startPod` is called.
 */
export { startPod } from './host';
