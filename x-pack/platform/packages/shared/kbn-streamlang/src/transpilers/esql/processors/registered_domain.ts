/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@elastic/esql/types';
import { Builder } from '@elastic/esql';
import type { RegisteredDomainProcessor } from '../../../../types/processors';
import {
  buildIgnoreMissingFilter,
  buildConditionalEval,
  buildCoalescePrefixedFieldsEval,
  buildDropColumns,
} from './common';

const DOMAIN_FIELDS = ['domain', 'registered_domain', 'subdomain', 'top_level_domain'] as const;

/**
 * Converts a Streamlang RegisteredDomainProcessor into a list of ES|QL AST commands.
 * - When `ignore_missing: false`: `WHERE NOT(fqdn IS NULL)` filters missing fields
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'domain',
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | REGISTERED_DOMAIN _temp_domain = fqdn
 *    | EVAL `domain.domain`              = COALESCE(`_temp_domain.domain`,             `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`_temp_domain.registered_domain`,  `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`_temp_domain.subdomain`,           `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`_temp_domain.top_level_domain`,    `domain.top_level_domain`)
 *    | DROP `_temp_domain.domain`, `_temp_domain.registered_domain`, `_temp_domain.subdomain`, `_temp_domain.top_level_domain`
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'domain',
 *          where: { field: 'fqdn', exists: true },
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL _temp_expression = CASE(NOT(fqdn IS NULL), fqdn, "")
 *    | REGISTERED_DOMAIN _temp_domain = _temp_expression
 *    | EVAL `domain.domain`              = COALESCE(`_temp_domain.domain`,            `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`_temp_domain.registered_domain`, `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`_temp_domain.subdomain`,          `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`_temp_domain.top_level_domain`,   `domain.top_level_domain`)
 *    | DROP `_temp_domain.domain`, `_temp_domain.registered_domain`, `_temp_domain.subdomain`, `_temp_domain.top_level_domain`, `_temp_expression`
 *    ```
 */
export function convertRegisteredDomainProcessorToESQL(
  processor: RegisteredDomainProcessor
): ESQLAstCommand[] {
  const { prefix, expression, ignore_missing = true } = processor;

  const isConditional = 'where' in processor && processor.where && !('always' in processor.where);

  const commands: ESQLAstCommand[] = [];

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, expression);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (isConditional) {
    commands.push(buildConditionalEval(processor.where!, expression, '_temp_expression'));
  }

  commands.push(
    Builder.command({
      name: 'registered_domain',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column('_temp_domain'),
          Builder.expression.column(isConditional ? '_temp_expression' : expression),
        ]),
      ],
    })
  );

  commands.push(buildCoalescePrefixedFieldsEval(DOMAIN_FIELDS, '_temp_domain', prefix));

  const dropColumns = DOMAIN_FIELDS.map((field) => `_temp_domain.${field}`);
  if (isConditional) {
    dropColumns.push('_temp_expression');
  }
  commands.push(buildDropColumns(dropColumns));

  return commands;
}
