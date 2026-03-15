/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDomain } from '../constants';
import { ELASTIC_LICENSE_HEADER } from '../constants';
import { toCamelCase, toPascalCase } from '../utils';

export function renderToolFile(opts: {
  name: string;
  domain: SkillDomain;
  toolId: string;
  description: string;
}): string {
  const schemaVar = `${toCamelCase(opts.name)}Schema`;
  const fnName = `get${toPascalCase(opts.name)}Tool`;

  return `${ELASTIC_LICENSE_HEADER}

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';

const ${schemaVar} = z.object({
  query: z.string().describe('TODO: Describe the input parameter'),
});

export function ${fnName}(): BuiltinToolDefinition<typeof ${schemaVar}> {
  return {
    id: '${opts.toolId}',
    type: ToolType.builtin,
    name: '${opts.name}',
    description:
      '${opts.description}',
    schema: ${schemaVar},
    tags: [],
    handler: async (params, _context) => {
      // TODO: Implement the tool handler
      return {
        results: [
          {
            type: 'text' as const,
            value: JSON.stringify({ message: 'Not yet implemented', query: params.query }),
          },
        ],
      };
    },
  };
}
`;
}
