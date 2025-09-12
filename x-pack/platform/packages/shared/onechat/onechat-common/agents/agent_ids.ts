/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores
export const agentIdRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
