/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { UserAgentProcessor } from '../../../../types/processors';

/**
 * Converts a Streamlang UserAgentProcessor into a list of ES|QL AST commands.
 *
 * Note: ES|QL does not currently have a USER_AGENT function.
 * This returns a warning comment to indicate the processor cannot be transpiled.
 *
 * The user_agent processor extracts details from browser user agent strings
 * including browser name, version, OS, and device information.
 *
 * @example
 *    ```typescript
 *    const processor: UserAgentProcessor = {
 *      action: 'user_agent',
 *      from: 'http.user_agent',
 *      to: 'user_agent',
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL "WARNING: user_agent processor not supported in ES|QL"
 *    ```
 */
export function convertUserAgentProcessorToESQL(_processor: UserAgentProcessor): ESQLAstCommand[] {
  return [
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.literal.string('WARNING: user_agent processor not supported in ES|QL'),
      ],
    }),
  ];
}
