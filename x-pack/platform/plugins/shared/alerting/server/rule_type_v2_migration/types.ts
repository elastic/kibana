/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { RuleTypeParams } from '../types';

/**
 * An alerting v2 rule derived from a classic rule. It is a starting point for the user to
 * review, so it is not guaranteed to pass alerting v2 create validation.
 */
export type RuleV2Draft = CreateRuleData;

/** The fields of a {@link RuleV2Draft} that `buildV2Draft` fills from the classic rule itself. */
type FrameworkMappedField =
  | 'kind'
  | 'metadata'
  | 'schedule'
  | 'recovery'
  | 'no_data'
  | 'state_transition'
  | 'artifacts';

/**
 * A {@link RuleV2Draft} without the fields the framework maps, so it holds what depends on a rule
 * type's params. `schedule` is replaced by `lookback`, because `schedule.every` comes from the
 * classic schedule interval.
 */
export interface RuleParamsV2Draft extends Omit<RuleV2Draft, FrameworkMappedField> {
  /** Becomes `schedule.lookback`, for example `5m`. */
  lookback: NonNullable<RuleV2Draft['schedule']['lookback']>;
}

/** Converts the params of one rule type into the params-dependent part of a v2 rule draft. */
export type ToV2DraftFn<Params extends RuleTypeParams = RuleTypeParams> = (
  params: Params
) => RuleParamsV2Draft;

/** Registered by a rule type to make its rules migratable to alerting v2. */
export interface RuleTypeV2Migration<Params extends RuleTypeParams = RuleTypeParams> {
  /**
   * Receives only the rule's params. The framework maps the fields every rule has (name, tags,
   * schedule, alert delay and artifacts). Throws when the params cannot be converted.
   */
  toV2Draft: ToV2DraftFn<Params>;
}
