/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleBuilderRegistry } from '@kbn/alerting-v2-rule-form';
import { attachRuleBuilderRegistry } from './rule_builder_registration';

// Statically imports the rule form package: import only from lazy-chunk code. Plugin setup
// must go through `rule_builder_registration`, which keeps the package out of page load.
export const ruleBuilderRegistry = attachRuleBuilderRegistry(new RuleBuilderRegistry());
