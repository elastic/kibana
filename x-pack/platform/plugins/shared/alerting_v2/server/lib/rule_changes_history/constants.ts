/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export {
  RULE_CHANGES_HISTORY_DATASET,
  RULE_CHANGES_HISTORY_MODULE,
} from '../../../common/rule_changes_history_constants';

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

/**
 * Fallback `metadata.revision` value when a rule has no persisted revision yet
 * (e.g. rules created before this field was introduced, pending model-version
 * migration). Zero means "never meaningfully edited", which is a safe read-time
 * default for any pre-existing rule.
 */
export const RULE_REVISION_FALLBACK = 0;
