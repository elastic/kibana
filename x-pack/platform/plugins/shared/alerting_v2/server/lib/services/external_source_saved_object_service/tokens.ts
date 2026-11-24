/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { ExternalSourceSavedObjectServiceContract } from './types';

/**
 * Pre-configured SavedObjects client with hidden types for external sources
 */
export const ExternalSourceSavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.ExternalSourceSavedObjectsClient'
);

/**
 * ExternalSourceSavedObjectService scoped to the current request
 */
export const ExternalSourceSavedObjectServiceScopedToken =
  createToken<ExternalSourceSavedObjectServiceContract>(
    'alerting_v2.ExternalSourceSavedObjectServiceScoped'
  );

/**
 * ExternalSourceSavedObjectService singleton (internal user, no request scope)
 */
export const ExternalSourceSavedObjectServiceInternalToken =
  createToken<ExternalSourceSavedObjectServiceContract>(
    'alerting_v2.ExternalSourceSavedObjectServiceInternal'
  );
