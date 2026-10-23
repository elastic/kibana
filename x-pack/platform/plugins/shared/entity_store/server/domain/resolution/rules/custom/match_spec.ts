/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { InvalidCustomResolutionRuleError } from '../../../errors';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import type { CustomResolutionRule } from './client';
import { CUSTOM_RULE_NAMESPACE_PATTERN } from './constants';
import { normalizeSingleEsqlExpression } from './expression';

/** The parts of a custom rule that decide what it links. */
export type CustomResolutionRuleDefinition = Pick<
  CustomResolutionRule,
  'namespaces' | 'filter' | 'match_value' | 'decline_same_namespace_duplicates'
>;

/**
 * Validates a rule definition and turns it into the matcher's spec.
 *
 * @throws InvalidCustomResolutionRuleError
 */
export const toExpressionMatchSpec = (
  definition: CustomResolutionRuleDefinition
): EsqlExpressionMatchSpec => {
  const {
    namespaces,
    filter,
    match_value: matchValue,
    decline_same_namespace_duplicates: declineSameNamespaceDuplicates,
  } = definition;

  if (namespaces.length === 0) {
    throw new InvalidCustomResolutionRuleError('must list at least one namespace', 'namespaces');
  }
  const invalid = namespaces.filter((namespace) => !CUSTOM_RULE_NAMESPACE_PATTERN.test(namespace));
  if (invalid.length > 0) {
    throw new InvalidCustomResolutionRuleError(
      `must be letters, digits, '_', '.' or '-': ${invalid.join(', ')}`,
      'namespaces'
    );
  }
  if (new Set(namespaces).size !== namespaces.length) {
    throw new InvalidCustomResolutionRuleError('must not repeat a namespace', 'namespaces');
  }

  const { expression: matchValueExpression, readsAField } = normalizeSingleEsqlExpression(
    'match_value',
    matchValue
  );
  if (!readsAField) {
    throw new InvalidCustomResolutionRuleError(
      'must read at least one field: a constant key puts every entity in one group',
      'match_value'
    );
  }

  return {
    namespaces: [...namespaces],
    ...(filter !== undefined && {
      filterExpression: normalizeSingleEsqlExpression('filter', filter).expression,
    }),
    matchValueExpression,
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
  match_value: matchValue,
  decline_same_namespace_duplicates: declineSameNamespaceDuplicates,
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
