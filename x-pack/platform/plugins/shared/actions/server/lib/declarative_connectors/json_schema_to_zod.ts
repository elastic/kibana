/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { DeclarativeJsonSchema } from './types';
import { DeclarativeConnectorSpecError } from './types';

const stripFieldUi = (definition: DeclarativeJsonSchema): Record<string, unknown> => {
  const { xUi: _xUi, properties, items, ...rest } = definition;
  return {
    ...rest,
    ...(properties
      ? {
          properties: Object.fromEntries(
            Object.entries(properties).map(([key, property]) => [key, stripFieldUi(property)])
          ),
        }
      : {}),
    ...(items ? { items: stripFieldUi(items) } : {}),
  };
};

/** Converts a declarative JSON Schema object into a Zod schema. */
export const declarativeJsonSchemaToZod = (definition: DeclarativeJsonSchema): z.ZodType => {
  const converted = fromJSONSchema(stripFieldUi(definition));
  if (converted === undefined) {
    throw new DeclarativeConnectorSpecError(
      `Could not convert declarative JSON Schema of type "${definition.type}" to Zod.`
    );
  }
  return converted;
};
