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
 * ES|QL does not currently support a USER_AGENT command, so this processor
 * emits a warning message similar to how manual_ingest_pipeline is handled.
 *
 * The user_agent processor is fully supported in Ingest Pipeline transpilation,
 * but ES|QL lacks an equivalent command for parsing user agent strings.
 *
 * @example
 *    ```typescript
 *    const processor: UserAgentProcessor = {
 *      action: 'user_agent',
 *      from: 'http.user_agent',
 *      to: 'parsed_agent',
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL "WARNING: user_agent processor not supported in ES|QL"
 *    ```
 */
export function convertUserAgentProcessorToESQL(_processor: UserAgentProcessor): ESQLAstCommand[] {
  // ES|QL does not have a USER_AGENT command, so we emit a warning
  // This is similar to how manual_ingest_pipeline is handled
  return [
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.literal.string('WARNING: user_agent processor not supported in ES|QL'),
      ],
    }),
  ];
}
