/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyInvalidationServiceContract } from './api_key_invalidation_service';

/**
 * Internal Saved Objects client that can create/read the API key pending invalidation type.
 * Used by the invalidation task and by ApiKeyInvalidationService (mark for invalidation).
 */
export const ApiKeyInvalidationSavedObjectsClientToken = Symbol.for(
  'alerting_v2.ApiKeyInvalidationSavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

/**
 * Service that marks API keys for invalidation (writes to pending-invalidation SO type).
 */
export const ApiKeyInvalidationServiceToken = Symbol.for(
  'alerting_v2.ApiKeyInvalidationService'
) as ServiceIdentifier<ApiKeyInvalidationServiceContract>;
