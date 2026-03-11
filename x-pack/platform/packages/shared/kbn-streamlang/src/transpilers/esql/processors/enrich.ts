/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type { EnrichProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';

/**
 * Converts a Streamlang EnrichProcessor into a list of ES|QL AST commands.
 * @param processor - The EnrichProcessor to convert
 * @returns A list of ES|QL AST commands
 * @example
 * Input:
 * { action: 'enrich', policy_name: 'ip_location', field: 'ip', to: 'location' }
 *
 * Output (basic, without enrich_fields):
 * | ENRICH ip_location ON ip
 *
 * Output (with enrich_fields: ['city', 'country']):
 * | ENRICH ip_location ON ip WITH location.city = city, location.country = country
 */
export const convertEnrichProcessorToESQL = (processor: EnrichProcessor): ESQLAstCommand[] => {
  const { policy_name, field, ignore_missing = false } = processor;
  const commands: ESQLAstCommand[] = [];

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, field);
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
    args: [Builder.expression.column(field)],
  });

  const enrichCmd = Builder.command({
    name: 'enrich',
    args: [policySource, onOption],
  });

  // TODO: Add support for "to" and "override" options
  commands.push(enrichCmd);
  return commands;
};
