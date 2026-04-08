/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';
import type { NotificationPolicySavedObjectServiceContract } from './types';

/**
 * Pre-configured SavedObjects client with hidden types for notification policies
 */
export const NotificationPolicySavedObjectsClientToken = Symbol.for(
  'alerting_v2.NotificationPolicySavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

/**
 * NotificationPolicySavedObjectService scoped to the current request
 */
export const NotificationPolicySavedObjectServiceScopedToken = Symbol.for(
  'alerting_v2.NotificationPolicySavedObjectServiceScoped'
) as ServiceIdentifier<NotificationPolicySavedObjectServiceContract>;

/**
 * NotificationPolicySavedObjectService singleton (internal user, no request scope)
 */
export const NotificationPolicySavedObjectServiceInternalToken = Symbol.for(
  'alerting_v2.NotificationPolicySavedObjectServiceInternal'
) as ServiceIdentifier<NotificationPolicySavedObjectServiceContract>;
