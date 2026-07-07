/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

/** `event.module` used to scope alerting v2 rule change history entries. */
export const RULE_CHANGE_HISTORY_MODULE = 'response-ops';

/** `event.dataset` used to scope alerting v2 rule change history entries. */
export const RULE_CHANGE_HISTORY_DATASET = 'alerting-v2-rules';

/** `object.type` written for every rule change history entry. */
export const RULE_CHANGE_HISTORY_OBJECT_TYPE = RULE_SAVED_OBJECT_TYPE;

/**
 * Fallback `rule.version` stamped on `.rule-events` when a rule has no
 * `change_history_sequence` yet (e.g. rules created before versioning).
 */
export const RULE_CONFIG_VERSION_FALLBACK = 1;
