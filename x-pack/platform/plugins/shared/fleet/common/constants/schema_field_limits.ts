/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reporting threshold for human-readable names (policy, host, proxy and API key names, agent
 * and data tags) passed to `displayName.warn()`. Overlong names are recorded, not rejected.
 */
export const FLEET_SCHEMA_NAME_MAX_LENGTH = 255;
