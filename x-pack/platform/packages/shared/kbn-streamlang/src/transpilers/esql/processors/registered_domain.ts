/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@elastic/esql/types';
import { Builder } from '@elastic/esql';
import { isAlwaysCondition } from '../../../../types/conditions';
import type { RegisteredDomainProcessor } from '../../../../types/processors';
import {
  buildIgnoreMissingFilter,
  buildConditionalEval,
  buildCoalescePrefixedFieldsEval,
  buildDropColumns,
} from './common';

const internalColumnPrefix = '__streamlang_registered_domain';

const internalExpressionColumn = '__streamlang_registered_domain_expression';

const DOMAIN_FIELDS = ['domain', 'registered_domain', 'subdomain', 'top_level_domain'];

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
 *    | REGISTERED_DOMAIN __streamlang_registered_domain = fqdn
 *    | EVAL `domain.domain`              = COALESCE(`__streamlang_registered_domain.domain`,             `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`__streamlang_registered_domain.registered_domain`,  `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`__streamlang_registered_domain.subdomain`,           `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`__streamlang_registered_domain.top_level_domain`,    `domain.top_level_domain`)
 *    | DROP `__streamlang_registered_domain.domain`, `__streamlang_registered_domain.registered_domain`, `__streamlang_registered_domain.subdomain`, `__streamlang_registered_domain.top_level_domain`
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
 *    | EVAL __streamlang_registered_domain_expression = CASE(NOT(fqdn IS NULL), fqdn, "")
 *    | REGISTERED_DOMAIN __streamlang_registered_domain = __streamlang_registered_domain_expression
 *    | EVAL `domain.domain`              = COALESCE(`__streamlang_registered_domain.domain`,            `domain.domain`),
 *           `domain.registered_domain`   = COALESCE(`__streamlang_registered_domain.registered_domain`, `domain.registered_domain`),
 *           `domain.subdomain`           = COALESCE(`__streamlang_registered_domain.subdomain`,          `domain.subdomain`),
 *           `domain.top_level_domain`    = COALESCE(`__streamlang_registered_domain.top_level_domain`,   `domain.top_level_domain`)
 *    | DROP `__streamlang_registered_domain.domain`, `__streamlang_registered_domain.registered_domain`, `__streamlang_registered_domain.subdomain`, `__streamlang_registered_domain.top_level_domain`, `__streamlang_registered_domain_expression`
 *    ```
 */
export function convertRegisteredDomainProcessorToESQL(
  processor: RegisteredDomainProcessor
): ESQLAstCommand[] {
  const { prefix, expression, ignore_missing = true } = processor;

  const isConditional =
    'where' in processor && processor.where && !isAlwaysCondition(processor.where);

  const commands: ESQLAstCommand[] = [];

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, expression);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (isConditional) {
    commands.push(buildConditionalEval(processor.where!, expression, internalExpressionColumn));
  }

  commands.push(
    Builder.command({
      name: 'registered_domain',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(internalColumnPrefix),
          Builder.expression.column(isConditional ? internalExpressionColumn : expression),
        ]),
      ],
    })
  );

  commands.push(buildCoalescePrefixedFieldsEval(DOMAIN_FIELDS, internalColumnPrefix, prefix));

  const dropColumns = DOMAIN_FIELDS.map((field) => `${internalColumnPrefix}.${field}`);
  if (isConditional) {
    dropColumns.push(internalExpressionColumn);
  }
  commands.push(buildDropColumns(dropColumns));

  return commands;
}
