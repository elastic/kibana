/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { ActionPolicySavedObjectServiceContract } from './types';

/**
 * Pre-configured SavedObjects client with hidden types for action policies
 */
export const ActionPolicySavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.ActionPolicySavedObjectsClient'
);

/**
 * ActionPolicySavedObjectService scoped to the current request
 */
export const ActionPolicySavedObjectServiceScopedToken =
  createToken<ActionPolicySavedObjectServiceContract>(
    'alerting_v2.ActionPolicySavedObjectServiceScoped'
  );

/**
 * ActionPolicySavedObjectService singleton (internal user, no request scope)
 */
export const ActionPolicySavedObjectServiceInternalToken =
  createToken<ActionPolicySavedObjectServiceContract>(
    'alerting_v2.ActionPolicySavedObjectServiceInternal'
  );
