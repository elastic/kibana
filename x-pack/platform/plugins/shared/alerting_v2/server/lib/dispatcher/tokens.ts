/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { DispatcherService } from './dispatcher';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';

/**
 * DispatcherService scoped to the current request
 */
export const DispatcherServiceScopedToken = Symbol.for(
  'alerting_v2.DispatcherServiceScoped'
) as ServiceIdentifier<DispatcherService>;

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
