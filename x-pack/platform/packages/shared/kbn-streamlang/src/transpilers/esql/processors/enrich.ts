/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type { EnrichPolicyResolver } from '../../../../types/resolvers';
import type { EnrichProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';

/**
 * Converts a Streamlang EnrichProcessor into a list of ES|QL AST commands.
 * @param processor - The EnrichProcessor to convert.
 * @param resolver - The resolver to get the enrich policy metadata.
 * @returns The list of ES|QL AST commands.
 * @example
 * Input:
 * {
 *   action: 'enrich',
 *   policy_name: 'ip_location',
 *   to: 'location',
 *   ignore_missing: false,
 * }
 *
 * Resolver:
 * (policyName: string) => Promise<EnrichPolicyMetadata | null>
 *
 * Return:
 * {
 *   matchField: 'ip',
 *   enrichFields: ['city', 'country'],
 * }
 * Output:
 * | ENRICH ip_location ON ip WITH location.city = city, location.country = country
 */
export const convertEnrichProcessorToESQL = async (
  processor: EnrichProcessor,
  resolver: EnrichPolicyResolver
): Promise<ESQLAstCommand[]> => {
  // TODO - add support for the "override" option
  const { policy_name, to, ignore_missing = false } = processor;
  const commands: ESQLAstCommand[] = [];

  const policyMetadata = await resolver(policy_name);

  if (!policyMetadata) {
    throw new Error(`Enrich policy ${policy_name} not found through resolver`);
  }

  if (!policyMetadata.matchField) {
    throw new Error(`Enrich policy ${policy_name} match field is required through resolver`);
  }

  if (!policyMetadata.enrichFields || policyMetadata.enrichFields.length === 0) {
    throw new Error(`Enrich policy ${policy_name} has no enrich fields through resolver`);
  }

  const { matchField, enrichFields } = policyMetadata;

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, matchField);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const policySource = Builder.expression.source.node({
    sourceType: 'policy',
    name: policy_name,
    index: policy_name,
  });

  const onOption = Builder.option({
    name: 'on',
    args: [Builder.expression.column(matchField)],
  });

  const withAssignments = enrichFields.map((field) =>
    Builder.expression.func.binary('=', [
      Builder.expression.column(`${to}.${field}`),
      Builder.expression.column(field),
    ])
  );

  const withOption = Builder.option({
    name: 'with',
    args: withAssignments,
  });

  const enrichCmd = Builder.command({
    name: 'enrich',
    args: [policySource, onOption, withOption],
  });

  commands.push(enrichCmd);
  return commands;
};
