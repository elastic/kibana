/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Bounds the serviceName path param to satisfy the CodeQL "unbounded string in
// route validation" rule; 1024 matches the ES keyword default `ignore_above`.
export const MAX_SERVICE_NAME_LENGTH = 1_024;
