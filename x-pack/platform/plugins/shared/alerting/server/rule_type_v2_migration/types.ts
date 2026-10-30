/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { RuleTypeParams, SanitizedRule } from '../types';

/**
 * An alerting v2 rule derived from a classic rule. It is a starting point for the user to
 * review, so it is not guaranteed to pass alerting v2 create validation.
 */
export type RuleV2Draft = CreateRuleData;

/** Converts a classic rule of one rule type into an alerting v2 rule draft. */
export type ToV2DraftFn<Params extends RuleTypeParams = RuleTypeParams> = (
  rule: SanitizedRule<Params>
) => RuleV2Draft;

/** Registered by a rule type to make its rules migratable to alerting v2. */
export interface RuleTypeV2Migration<Params extends RuleTypeParams = RuleTypeParams> {
  /**
   * Receives the whole classic rule, so the rule type owns the mapping of its name, tags,
   * schedule and params. Throws when the rule cannot be converted.
   */
  toV2Draft: ToV2DraftFn<Params>;
}
