/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getAuthoringContext } from '@kbn/adaptive-ui';
import { adaptiveUiTools } from '../../common/constants';

const getAuthoringContextSchema = z.object({});

export const getAuthoringContextTool = (): BuiltinToolDefinition<
  typeof getAuthoringContextSchema
> => ({
  id: adaptiveUiTools.getAuthoringContext,
  type: ToolType.builtin,
  description: `Return the Adaptive UI authoring context: the spec guide, the ViewSpec JSON schema, and the primitive catalog.

Call this before composing a ViewSpec for \`${adaptiveUiTools.renderView}\` when you need the exact node shapes. The payload is large; call it once per conversation and reuse the result.`,
  schema: getAuthoringContextSchema,
  tags: ['adaptive-ui'],
  handler: async () => {
    const { guide, rules, schema, primitives, views } = getAuthoringContext();
    return {
      results: [
        {
          type: ToolResultType.other as const,
          data: { guide, rules, schema, primitives, views },
        },
      ],
    };
  },
});
