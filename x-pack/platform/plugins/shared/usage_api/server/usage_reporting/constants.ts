/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum number of retry attempts for sending usage records. */
export const METERING_RETRY_ATTEMPTS = 3;

/** Base delay between retries in milliseconds (exponential backoff applied). */
export const METERING_RETRY_BASE_DELAY_MS = 1000;
