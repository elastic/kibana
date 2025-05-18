/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defaultRuleAggregationFactory } from './factories/default_rule_aggregation_factory/latest';
export { defaultRuleAggregationFactory as defaultRuleAggregationFactoryV1 } from './factories/default_rule_aggregation_factory/v1';
// export { aggregateOptionsSchema } from './schemas';
// export type { AggregateOptions, AggregateParams, DefaultRuleAggregationParams } from './types';

export { aggregateRules } from './aggregate_rules';
