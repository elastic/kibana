/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';
import { customContentStateSchema, customContentUpdateSchema } from './schema';

describe('customContentStateSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(customContentStateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts all fields populated', () => {
    expect(
      customContentStateSchema.safeParse({
        template: '<div>{{ row["rate"].value }}</div>',
        esqlQuery: 'FROM logs-* | STATS rate = AVG(error) BY host',
      }).success
    ).toBe(true);
  });

  it('does not persist a prompt', () => {
    const parsed = customContentStateSchema.parse({
      prompt: 'Show error rate',
      template: '<div>hi</div>',
    });

    expect(parsed).not.toHaveProperty('prompt');
  });

  it('rejects a template exceeding CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH', () => {
    expect(
      customContentStateSchema.safeParse({
        template: 'a'.repeat(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an esqlQuery exceeding CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH', () => {
    expect(
      customContentStateSchema.safeParse({
        esqlQuery: 'a'.repeat(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});

describe('customContentUpdateSchema', () => {
  it('accepts a prompt on its own', () => {
    expect(customContentUpdateSchema.safeParse({ prompt: 'Make it blue' }).success).toBe(true);
  });

  it('accepts an esqlQuery on its own', () => {
    expect(customContentUpdateSchema.safeParse({ esqlQuery: 'FROM logs-*' }).success).toBe(true);
  });

  it('requires at least one of prompt or esqlQuery', () => {
    expect(customContentUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a null esqlQuery to clear the query', () => {
    expect(customContentUpdateSchema.safeParse({ esqlQuery: null }).success).toBe(true);
  });

  it('rejects a prompt exceeding CUSTOM_CONTENT_MAX_PROMPT_LENGTH', () => {
    expect(
      customContentUpdateSchema.safeParse({
        prompt: 'a'.repeat(CUSTOM_CONTENT_MAX_PROMPT_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('rejects an empty prompt', () => {
    expect(customContentUpdateSchema.safeParse({ prompt: '' }).success).toBe(false);
  });
});
