/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeRegistry } from '../../../../../rule_type_registry';

export const getRuleTypeParamsSchemaTool = (ruleTypeId: string, registry: RuleTypeRegistry) => {
  let ruleType;
  try {
    ruleType = registry.get(ruleTypeId);
  } catch {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: `Rule type "${ruleTypeId}" not found` }),
        },
      ],
      isError: true,
    };
  }

  const paramsSchema = ruleType?.schemas?.params;

  if (!paramsSchema) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: `No params schema available for rule type "${ruleTypeId}". Use the validate.params field or refer to documentation.`,
          }),
        },
      ],
      isError: true,
    };
  }

  if (paramsSchema.type === 'config-schema') {
    const description = paramsSchema.schema.getSchema().describe();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(description, null, 2) }],
    };
  }

  if (paramsSchema.type === 'zod') {
    // Return the Zod schema's shape keys with their descriptions
    const schema = paramsSchema.schema;
    // For ZodObject, extract keys
    if ('shape' in schema && schema.shape) {
      const shape: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        schema.shape as Record<string, { _def?: { description?: string; typeName?: string } }>
      )) {
        shape[key] = {
          typeName: value._def?.typeName,
          description: value._def?.description,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(shape, null, 2) }],
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ info: 'Zod schema present but shape not extractable' }),
        },
      ],
    };
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unknown schema type' }) }],
    isError: true,
  };
};
