/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';

/**
 * Internal Saved Objects client that can create/read the API key pending invalidation type.
 */
export const ApiKeyServiceSavedObjectsClientToken = Symbol.for(
  'alerting_v2.ApiKeyServiceSavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;
