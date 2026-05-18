/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';
import type { RuleBuilderConfigSavedObjectServiceContract } from './rule_builder_config_saved_object_service';

export const RuleBuilderConfigSavedObjectsClientToken = Symbol.for(
  'RuleBuilderConfigSavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

export const RuleBuilderConfigSavedObjectServiceScopedToken = Symbol.for(
  'RuleBuilderConfigSavedObjectServiceScoped'
) as ServiceIdentifier<RuleBuilderConfigSavedObjectServiceContract>;
