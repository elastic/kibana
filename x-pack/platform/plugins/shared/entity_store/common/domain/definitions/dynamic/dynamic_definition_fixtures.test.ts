/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DYNAMIC_DEFINITION_FIXTURES,
  userShapedDynamicFixture,
} from './__fixtures__/dynamic_definition_fixtures';
import { SERVABLE_IDENTITY_RULE } from './dynamic_definition_rules';
import { ALL_ENTITY_TYPES, entitySchema } from '../entity_schema';
import { getBuiltInEntityDefinition } from '../registry';

describe('dynamic definition fixtures', () => {
  it.each(DYNAMIC_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
    '%s parses against entitySchema',
    (type, definition) => {
      const result = entitySchema.safeParse({ ...definition, id: `${type}-default` });
      expect(result.error?.issues).toBeUndefined();
      expect(result.data?.dynamic).toEqual(definition.dynamic);
    }
  );

  it('rejects the user-shaped definition with the servable identity rule', () => {
    const result = entitySchema.safeParse({ ...userShapedDynamicFixture, id: 'user-default' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ message }) => message).join('; ')).toContain(
      SERVABLE_IDENTITY_RULE
    );
  });

  it.each(ALL_ENTITY_TYPES)('built-in %s parses with no dynamic block', (type) => {
    const definition = getBuiltInEntityDefinition(type);
    expect(definition.dynamic).toBeUndefined();
    expect(entitySchema.safeParse({ ...definition, id: type }).success).toBe(true);
  });
});
