/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { createSoFilterBuilder } from '../build_so_filter';

/**
 * Translates a clean API action policy filter string into a saved-object KQL filter.
 *
 * @example
 * buildActionPolicySoFilter('enabled: true')
 * // → 'alerting_action_policy.attributes.enabled: true'
 *
 * @throws Boom badRequest (400) if the filter contains a field name not in
 *   the allowed set or uses an unsupported KQL function.
 */
export const buildActionPolicySoFilter = createSoFilterBuilder({
  savedObjectType: ACTION_POLICY_SAVED_OBJECT_TYPE,
  fieldMap: {
    id: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.id`,
    name: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.name`,
    description: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.description`,
    enabled: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.enabled`,
  },
});
