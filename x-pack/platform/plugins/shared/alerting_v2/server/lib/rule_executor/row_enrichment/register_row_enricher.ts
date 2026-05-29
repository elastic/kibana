/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionRowEnricher } from './types';

let registeredRowEnricher: RuleExecutionRowEnricher | undefined;

/**
 * Registers (or replaces) the global row enricher invoked during alerting v2 rule execution.
 * Intended for solution plugins such as Security that enrich detection-shaped rows before
 * they are written to `.rule-events`.
 */
export const registerRuleExecutionRowEnricher = (enricher: RuleExecutionRowEnricher): void => {
  registeredRowEnricher = enricher;
};

export const getRuleExecutionRowEnricher = (): RuleExecutionRowEnricher | undefined =>
  registeredRowEnricher;
