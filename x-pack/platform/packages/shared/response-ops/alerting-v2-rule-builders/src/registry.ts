/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderType } from './types';
import { thresholdRuleBuilderType } from './threshold/definition';

/**
 * Erases a builder's params and form state types so builders with different
 * schemas can share one registry. Callers validate params with `paramsSchema`.
 */
const defineRuleBuilderType = <TParams, TFormState>(
  builder: RuleBuilderType<TParams, TFormState>
): RuleBuilderType => builder as unknown as RuleBuilderType;

/** Every rule builder type, keyed by the type stored in `metadata.builder.type`. */
export const RULE_BUILDER_TYPES: Readonly<Record<string, RuleBuilderType>> = {
  [thresholdRuleBuilderType.type]: defineRuleBuilderType(thresholdRuleBuilderType),
};

export const getRuleBuilderType = (type: string): RuleBuilderType | undefined =>
  Object.hasOwn(RULE_BUILDER_TYPES, type) ? RULE_BUILDER_TYPES[type] : undefined;
