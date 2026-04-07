/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import type { EnrichPolicyResolver } from '../../../../types/resolvers';
import type { EnrichProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';

const internalPrevColumn = (index: number) => `__streamlang_enrich_prev_${index}`;
const internalNewColumn = (index: number) => `__streamlang_enrich_new_${index}`;

const targetColumnName = (to: string, policyField: string) => `${to}.${policyField}`;

function pushEnrichCommand(
  commands: ESQLAstCommand[],
  policy_name: string,
  matchField: string,
  withAssignments: ESQLAstItem[]
): void {
  const policySource = Builder.expression.source.node({
    sourceType: 'policy',
    name: policy_name,
    index: policy_name,
  });

  const onOption = Builder.option({
    name: 'on',
    args: [Builder.expression.column(matchField)],
  });

  const withOption = Builder.option({
    name: 'with',
    args: withAssignments,
  });

  commands.push(
    Builder.command({
      name: 'enrich',
      args: [policySource, onOption, withOption],
    })
  );
}

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
 *
 * Output:
 * | ENRICH ip_location ON ip WITH location.city = city, location.country = country
 */
export const convertEnrichProcessorToESQL = async (
  processor: EnrichProcessor,
  resolver: EnrichPolicyResolver
): Promise<ESQLAstCommand[]> => {
  const { policy_name, to, ignore_missing = false } = processor;
  const preserveExistingTargets = processor.override === false;
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

  if (preserveExistingTargets) {
    enrichFields.forEach((field, index) => {
      commands.push(
        Builder.command({
          name: 'eval',
          args: [
            Builder.expression.func.binary('=', [
              Builder.expression.column(internalPrevColumn(index)),
              Builder.expression.column(targetColumnName(to, field)),
            ]),
          ],
        })
      );
    });

    const withAssignmentsToTemp = enrichFields.map((field, index) =>
      Builder.expression.func.binary('=', [
        Builder.expression.column(internalNewColumn(index)),
        Builder.expression.column(field),
      ])
    );

    pushEnrichCommand(commands, policy_name, matchField, withAssignmentsToTemp);

    enrichFields.forEach((field, index) => {
      commands.push(
        Builder.command({
          name: 'eval',
          args: [
            Builder.expression.func.binary('=', [
              Builder.expression.column(targetColumnName(to, field)),
              Builder.expression.func.call('COALESCE', [
                Builder.expression.column(internalPrevColumn(index)),
                Builder.expression.column(internalNewColumn(index)),
              ]),
            ]),
          ],
        })
      );
    });

    enrichFields.forEach((_, index) => {
      commands.push(
        Builder.command({
          name: 'drop',
          args: [Builder.expression.column(internalPrevColumn(index))],
        })
      );
      commands.push(
        Builder.command({
          name: 'drop',
          args: [Builder.expression.column(internalNewColumn(index))],
        })
      );
    });
  } else {
    const withAssignments = enrichFields.map((field) =>
      Builder.expression.func.binary('=', [
        Builder.expression.column(targetColumnName(to, field)),
        Builder.expression.column(field),
      ])
    );
    pushEnrichCommand(commands, policy_name, matchField, withAssignments);
  }

  return commands;
};
