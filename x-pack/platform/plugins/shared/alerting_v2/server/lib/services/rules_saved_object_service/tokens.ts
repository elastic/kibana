/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RulesSavedObjectServiceContract } from './rules_saved_object_service';

/**
 * RulesSavedObjectService singleton (internal user, no request scope)
 */
export const RulesSavedObjectServiceInternalToken = Symbol.for(
  'alerting_v2.RulesSavedObjectServiceInternal'
) as ServiceIdentifier<RulesSavedObjectServiceContract>;
