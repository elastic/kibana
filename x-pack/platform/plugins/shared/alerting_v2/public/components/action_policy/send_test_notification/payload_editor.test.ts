/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPayloadJsonSchema } from './payload_editor';

describe('getPayloadJsonSchema', () => {
  it('returns a closed JSON Schema with nullable fields as type unions', () => {
    expect(getPayloadJsonSchema()).toMatchObject({
      additionalProperties: false,
      properties: {
        alerts: {
          items: {
            additionalProperties: false,
            properties: {
              rule_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            },
          },
        },
      },
    });
  });
});
