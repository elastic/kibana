/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

/** `event.module` used to scope alerting v2 rule changes history entries. */
export const RULE_CHANGES_HISTORY_MODULE = 'alerting-v2';

/** `event.dataset` used to scope alerting v2 rule changes history entries. */
export const RULE_CHANGES_HISTORY_DATASET = 'rules';

/** `object.type` written for every rule changes history entry. */
export const RULE_CHANGES_HISTORY_OBJECT_TYPE = RULE_SAVED_OBJECT_TYPE;

/** `ResourceManager` key under which the rule changes-history data stream is provisioned. */
export const RULE_CHANGES_HISTORY_RESOURCE_KEY = 'rule-changes-history';

/**
 * Fallback `rule.version` stamped on `.rule-events` (and surfaced as
 * `metadata.version`) when a rule has no persisted `version` yet (e.g. rules
 * created before versioning).
 */
export const RULE_VERSION_FALLBACK = 1;
