/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { ImportConfigSavedObjectServiceContract } from './types';

/**
 * Pre-configured SavedObjects client with hidden types for import configs
 */
export const ImportConfigSavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.ImportConfigSavedObjectsClient'
);

/**
 * ImportConfigSavedObjectService scoped to the current request
 */
export const ImportConfigSavedObjectServiceScopedToken =
  createToken<ImportConfigSavedObjectServiceContract>(
    'alerting_v2.ImportConfigSavedObjectServiceScoped'
  );

/**
 * ImportConfigSavedObjectService singleton (internal user, no request scope)
 */
export const ImportConfigSavedObjectServiceInternalToken =
  createToken<ImportConfigSavedObjectServiceContract>(
    'alerting_v2.ImportConfigSavedObjectServiceInternal'
  );
