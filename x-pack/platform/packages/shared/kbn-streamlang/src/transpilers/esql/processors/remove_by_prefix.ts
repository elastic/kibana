/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { RemoveByPrefixProcessor } from '../../../../types/processors';

/**
 * Converts a Streamlang RemoveByPrefixProcessor into a list of ES|QL AST commands.
 *
 * Removes all nested fields with the given prefix (field.*).
 * Note: When all nested fields are removed, the parent field is also removed by ES|QL.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove_by_prefix',
 *          from: 'host',
 *        } as RemoveByPrefixProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    | DROP host.*  // Removes all host.* fields; parent field 'host' is removed too if no other fields remain
 *    ```
 */
export function convertRemoveByPrefixProcessorToESQL(
  processor: RemoveByPrefixProcessor
): ESQLAstCommand[] {
  const { from } = processor;

  // Use DROP command to remove all nested fields (field.*)
  // This handles both subobjects and flattened fields
  // The parent field itself is NOT removed
  const dropCommand = Builder.command({
    name: 'drop',
    args: [
      Builder.expression.column({
        args: [Builder.identifier(from), Builder.identifier('*')],
      }),
    ],
  });

  return [dropCommand];
}
