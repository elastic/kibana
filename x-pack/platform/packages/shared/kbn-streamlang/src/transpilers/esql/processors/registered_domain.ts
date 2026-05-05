/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@elastic/esql/types';
import { Builder } from '@elastic/esql';
import type { RegisteredDomainProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter } from './common';

/**
 * Converts a Streamlang RegisteredDomainProcessor into a list of ES|QL AST commands.
 * - When `ignore_missing: false`: `WHERE NOT(expression IS NULL)` filters missing fields
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'rd',
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | REGISTERED_DOMAIN rd = fqdn
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'registered_domain',
 *          expression: 'fqdn',
 *          prefix: 'rd',
 *          where: { field: 'fqdn', exists: true },
 *        } as RegisteredDomainProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | WHERE fqdn IS NOT NULL
 *    | REGISTERED_DOMAIN rd = fqdn
 *    ```
 */
export function convertRegisteredDomainProcessorToESQL(
  processor: RegisteredDomainProcessor
): ESQLAstCommand[] {
  const { prefix, expression, where, ignore_missing = true } = processor;

  const commands: ESQLAstCommand[] = [];

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, expression);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if (where && !('always' in where)) {
    commands.push(
      Builder.command({
        name: 'where',
        args: [conditionToESQLAst(where)],
      })
    );
  }

  commands.push(
    Builder.command({
      name: 'registered_domain',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(prefix),
          Builder.expression.column(expression),
        ]),
      ],
    })
  );

  return commands;
}
