/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID } from '@kbn/management-settings-ids';
import { createIncludeFrozenSchema, getIncludeFrozenByDefault } from './include_frozen_schema';
import { createSchemaContext } from './test_utils';

describe('createIncludeFrozenSchema', () => {
  it('excludes frozen tier data when the default is false', () => {
    const schema = createIncludeFrozenSchema(false);

    expect(schema.parse(undefined)).toBe(false);
    expect(schema.description).toContain('Defaults to false');
    expect(schema.description).toContain('Only set to true');
  });

  it('includes frozen tier data when the default is true', () => {
    const schema = createIncludeFrozenSchema(true);

    expect(schema.parse(undefined)).toBe(true);
    expect(schema.description).toContain('Defaults to true');
    expect(schema.description).toContain('Only set to false');
  });

  it('keeps an explicit value over the default', () => {
    expect(createIncludeFrozenSchema(true).parse(false)).toBe(false);
    expect(createIncludeFrozenSchema(false).parse(true)).toBe(true);
  });
});

describe('getIncludeFrozenByDefault', () => {
  it.each([true, false])('returns the space setting value (%s)', async (value) => {
    const context = createSchemaContext(value);

    await expect(getIncludeFrozenByDefault(context)).resolves.toBe(value);
    expect(context.uiSettings.get).toHaveBeenCalledWith(
      AGENT_BUILDER_INCLUDE_FROZEN_BY_DEFAULT_SETTING_ID
    );
  });
});
