/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools } from '@kbn/agent-builder-common';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import { parseSpec, specAuthoringSchema } from '@kbn/agent-builder-surfaces';

const schema = z.object({
  spec: z
    .looseObject({})
    .describe('The Isomer spec of your reply, following the JSON Schema in the tool description.'),
});

const description = `Write an Isomer spec of your reply: the same answer as your message, in structured form, so it can be rendered on surfaces other than Kibana.

## Usage notes

- Call it in addition to writing your reply, never instead of it.
- If the spec is invalid, the tool returns the errors: fix them and call it again.
- If you call it more than once in a round, the last accepted spec is kept.

## Spec JSON Schema

${JSON.stringify(specAuthoringSchema)}
`;

export const createWriteSpecTool = (): InternalBuiltinToolDefinition<typeof schema> => ({
  id: internalTools.writeSpec,
  type: ToolType.builtin,
  description,
  schema,
  tags: ['internal'],
  excludeFromMcp: true,
  handler: async ({ spec }) => {
    const result = parseSpec(spec);

    if (!result.valid) {
      return {
        results: [
          createErrorResult({
            message: `The spec is invalid:\n${result.errors.join('\n')}`,
            metadata: { errors: result.errors },
          }),
        ],
      };
    }

    return { results: [createOtherResult({ accepted: true })] };
  },
});
