/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base path for all Cloud Connect internal API routes
 */
export const API_BASE_PATH = '/internal/cloud_connect';

/**
 * Saved object type name for Cloud Connect API key storage
 */
export const CLOUD_CONNECT_API_KEY_TYPE = 'cloud-connect-api-key';

/**
 * Use a constant UUID for the single API key stored per instance
 * This UUID is fixed to ensure we always retrieve the same saved object
 */
export const CLOUD_CONNECT_API_KEY_ID = '239feff0-7e11-4413-b800-f1f1621e9c69';
