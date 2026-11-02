/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { RulesSavedObjectServiceContract } from './rules_saved_object_service';

/**
 * Pre-configured SavedObjects client with hidden types for rules
 */
export const RuleSavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.RuleSavedObjectsClient'
);

/**
 * RulesSavedObjectService scoped to the current request
 */
export const RulesSavedObjectServiceScopedToken = createToken<RulesSavedObjectServiceContract>(
  'alerting_v2.RulesSavedObjectServiceScoped'
);

/**
 * RulesSavedObjectService singleton (internal user, no request scope)
 */
export const RulesSavedObjectServiceInternalToken = createToken<RulesSavedObjectServiceContract>(
  'alerting_v2.RulesSavedObjectServiceInternal'
);
