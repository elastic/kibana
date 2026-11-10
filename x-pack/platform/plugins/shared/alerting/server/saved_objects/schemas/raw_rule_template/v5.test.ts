/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertingV2RawRuleTemplateSchemaV5 } from './v5';

describe('alertingV2RawRuleTemplateSchemaV5', () => {
  it('accepts a rule without metadata', () => {
    expect(() =>
      alertingV2RawRuleTemplateSchemaV5.validate({ engine: 'v2', rule: {} })
    ).not.toThrow();
  });

  it('keeps the declared metadata paths and the undeclared rule fields', () => {
    const attributes = {
      engine: 'v2' as const,
      rule: {
        kind: 'alert',
        metadata: { name: 'My template', description: 'Details', tags: ['a', 'b'], owner: 'me' },
      },
    };

    expect(alertingV2RawRuleTemplateSchemaV5.validate(attributes)).toEqual(attributes);
  });

  it('rejects metadata fields with the wrong type', () => {
    expect(() =>
      alertingV2RawRuleTemplateSchemaV5.validate({
        engine: 'v2',
        rule: { metadata: { tags: 'not-an-array' } },
      })
    ).toThrow();
  });
});
