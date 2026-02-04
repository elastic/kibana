/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import { generateSchema } from './generate_schema';
import type { ConnectorSpec } from '@kbn/connector-specs';

describe('generateSchema', () => {
  it('generates schema with config and secrets', () => {
    const schema = generateSchema({
      schema: z4.object({
        url: z4.string().min(1),
      }),
      auth: {
        types: [
          'basic',
          {
            type: 'api_key_header',
            defaults: {
              headerField: 'custom-api-key-field',
            },
          },
        ],
      },
    } as unknown as ConnectorSpec);

    expect(z4.toJSONSchema(schema)).toMatchSnapshot();
  });
});
