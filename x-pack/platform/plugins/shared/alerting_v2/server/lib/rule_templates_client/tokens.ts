/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';

/**
 * Pre-configured SavedObjects client with the hidden alerting_rule_template type.
 * The SO type is registered by the alerting (v1) plugin.
 */
export const RuleTemplateSavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.RuleTemplateSavedObjectsClient'
);
