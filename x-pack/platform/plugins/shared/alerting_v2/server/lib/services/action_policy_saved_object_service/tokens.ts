/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';
import type { ActionPolicySavedObjectServiceContract } from './types';

/**
 * Pre-configured SavedObjects client with hidden types for action policies
 */
export const ActionPolicySavedObjectsClientToken = Symbol.for(
  'alerting_v2.ActionPolicySavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

/**
 * ActionPolicySavedObjectService scoped to the current request
 */
export const ActionPolicySavedObjectServiceScopedToken = Symbol.for(
  'alerting_v2.ActionPolicySavedObjectServiceScoped'
) as ServiceIdentifier<ActionPolicySavedObjectServiceContract>;

/**
 * ActionPolicySavedObjectService singleton (internal user, no request scope)
 */
export const ActionPolicySavedObjectServiceInternalToken = Symbol.for(
  'alerting_v2.ActionPolicySavedObjectServiceInternal'
) as ServiceIdentifier<ActionPolicySavedObjectServiceContract>;
