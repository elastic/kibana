/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { buildFormPromptsRequestSchema } from '.';

describe('buildFormPromptsRequestSchema', () => {
  it('returns an object with a form_prompts key', () => {
    const result = buildFormPromptsRequestSchema();

    expect(result).toHaveProperty('form_prompts');
  });

  it('form_prompts is optional — validates when undefined', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() => wrappedSchema.validate({ form_prompts: undefined })).not.toThrow();
  });

  it('accepts a valid array with execution_id, id, and values', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() =>
      wrappedSchema.validate({
        form_prompts: [{ execution_id: 'exec-1', id: 'prompt-1', values: { approved: true } }],
      })
    ).not.toThrow();
  });

  it('rejects an array item missing execution_id', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() =>
      wrappedSchema.validate({
        form_prompts: [{ id: 'prompt-1', values: { approved: true } }],
      })
    ).toThrow();
  });

  it('rejects an array item missing id', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() =>
      wrappedSchema.validate({
        form_prompts: [{ execution_id: 'exec-1', values: { approved: true } }],
      })
    ).toThrow();
  });

  it('rejects an array item missing values', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() =>
      wrappedSchema.validate({
        form_prompts: [{ execution_id: 'exec-1', id: 'prompt-1' }],
      })
    ).toThrow();
  });

  it('accepts values as an empty record', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() =>
      wrappedSchema.validate({
        form_prompts: [{ execution_id: 'exec-1', id: 'prompt-1', values: {} }],
      })
    ).not.toThrow();
  });

  it('accepts an empty array', () => {
    const { form_prompts: formPromptsSchema } = buildFormPromptsRequestSchema();
    const wrappedSchema = schema.object({ form_prompts: formPromptsSchema });

    expect(() => wrappedSchema.validate({ form_prompts: [] })).not.toThrow();
  });
});
