/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { DispatcherService } from './dispatcher';
import type { DispatcherStep } from './types';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';

/**
 * Token for multi-injecting the ordered dispatcher execution steps.
 * Binding order defines execution order.
 */
export const DispatcherExecutionStepsToken = Symbol.for(
  'alerting_v2.DispatcherExecutionSteps'
) as ServiceIdentifier<DispatcherStep>;

/**
 * DispatcherService singleton
 */
export const DispatcherServiceInternalToken = Symbol.for(
  'alerting_v2.DispatcherServiceInternal'
) as ServiceIdentifier<DispatcherService>;

/**
 * RulesSavedObjectService singleton (internal user, no request scope)
 */
export const RulesSavedObjectServiceInternalToken = Symbol.for(
  'alerting_v2.RulesSavedObjectServiceInternal'
) as ServiceIdentifier<RulesSavedObjectServiceContract>;

/**
 * NotificationPolicySavedObjectService singleton (internal user, no request scope)
 */
export const NotificationPolicySavedObjectServiceInternalToken = Symbol.for(
  'alerting_v2.NotificationPolicySavedObjectServiceInternal'
) as ServiceIdentifier<NotificationPolicySavedObjectServiceContract>;
