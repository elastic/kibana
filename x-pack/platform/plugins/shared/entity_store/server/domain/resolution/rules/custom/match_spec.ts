/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { InvalidCustomResolutionRuleError } from '../../../errors';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import { CUSTOM_RULE_NAMESPACE_PATTERN } from './constants';
import { normalizeEsqlExpression } from './expression';

/** The parts of a custom rule that decide what it links. */
export interface CustomResolutionRuleDefinition {
  namespaces: readonly string[];
  filter?: string;
  matchValue: string;
  declineSameNamespaceDuplicates: boolean;
}

/**
 * Validates a rule definition and turns it into the matcher's spec. Runs on
 * save and again before every maintainer run.
 *
 * @throws InvalidCustomResolutionRuleError
 */
export const toExpressionMatchSpec = (
  definition: CustomResolutionRuleDefinition
): EsqlExpressionMatchSpec => {
  const { namespaces, filter, matchValue, declineSameNamespaceDuplicates } = definition;

  if (namespaces.length === 0) {
    throw new InvalidCustomResolutionRuleError('namespaces', 'must list at least one namespace');
  }
  const invalid = namespaces.filter((namespace) => !CUSTOM_RULE_NAMESPACE_PATTERN.test(namespace));
  if (invalid.length > 0) {
    throw new InvalidCustomResolutionRuleError(
      'namespaces',
      `must be lowercase letters, digits or '_': ${invalid.join(', ')}`
    );
  }
  if (new Set(namespaces).size !== namespaces.length) {
    throw new InvalidCustomResolutionRuleError('namespaces', 'must not repeat a namespace');
  }

  return {
    namespaces: [...namespaces],
    ...(filter !== undefined && { filterExpression: normalizeEsqlExpression('filter', filter) }),
    matchValueExpression: normalizeEsqlExpression('match_value', matchValue),
    declineSameNamespaceDuplicates,
  };
};

/**
 * Hash of what the rule links on. Stored next to the rule's watermark; when it
 * changes the rule rescans from scratch. Name and enabled are not part of it.
 */
export const fingerprintMatchSpec = (spec: EsqlExpressionMatchSpec): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        [...spec.namespaces].sort(),
        spec.filterExpression ?? null,
        spec.matchValueExpression,
        spec.declineSameNamespaceDuplicates !== false,
      ])
    )
    .digest('hex');
