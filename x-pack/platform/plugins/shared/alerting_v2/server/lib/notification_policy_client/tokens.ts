/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

/**
 * Request-scoped Saved Objects namespace for the current request (from Spaces).
 * Used by NotificationPolicyClient for getDecryptedAuth.
 */
export const NotificationPolicyNamespaceToken = Symbol.for(
  'alerting_v2.NotificationPolicyNamespace'
) as ServiceIdentifier<string | undefined>;
