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
import { parseSingleEsqlExpression } from './expression';

/** The parts of a custom rule that decide what it links. */
export interface CustomResolutionRuleDefinition {
  namespaces: readonly string[];
  filter?: string;
  matchValue: string;
  declineSameNamespaceDuplicates: boolean;
}

/**
 * Validates a rule definition and turns it into the matcher's spec.
 *
 * @throws InvalidCustomResolutionRuleError
 */
export const toExpressionMatchSpec = (
  definition: CustomResolutionRuleDefinition
): EsqlExpressionMatchSpec => {
  const { namespaces, filter, matchValue, declineSameNamespaceDuplicates } = definition;

  if (namespaces.length === 0) {
    throw new InvalidCustomResolutionRuleError('must list at least one namespace', 'namespaces');
  }
  const invalid = namespaces.filter((namespace) => !CUSTOM_RULE_NAMESPACE_PATTERN.test(namespace));
  if (invalid.length > 0) {
    throw new InvalidCustomResolutionRuleError(
      `must be lowercase letters, digits or '_': ${invalid.join(', ')}`,
      'namespaces'
    );
  }
  if (new Set(namespaces).size !== namespaces.length) {
    throw new InvalidCustomResolutionRuleError('must not repeat a namespace', 'namespaces');
  }

  return {
    namespaces: [...namespaces],
    ...(filter !== undefined && { filterExpression: parseSingleEsqlExpression('filter', filter) }),
    matchValueExpression: parseSingleEsqlExpression('match_value', matchValue),
    declineSameNamespaceDuplicates,
  };
};

/**
 * Canonical form of a definition: namespace order and surrounding whitespace
 * don't count. Built from the stored source, not the re-printed expressions,
 * so an ES|QL printer upgrade can't reset every rule's watermark.
 */
export const canonicalDefinitionKey = ({
  namespaces,
  filter,
  matchValue,
  declineSameNamespaceDuplicates,
}: CustomResolutionRuleDefinition): string =>
  JSON.stringify([
    [...namespaces].sort(),
    filter?.trim() ?? null,
    matchValue.trim(),
    declineSameNamespaceDuplicates,
  ]);

/** Hash of the parts of a rule that decide what it links. */
export const fingerprintDefinition = (definition: CustomResolutionRuleDefinition): string =>
  createHash('sha256').update(canonicalDefinitionKey(definition)).digest('hex');
