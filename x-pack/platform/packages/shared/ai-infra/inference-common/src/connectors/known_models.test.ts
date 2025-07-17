/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModelDefinition } from './known_models';

describe('getModelDefinition', () => {
  it('returns the expected models for common openAI full model names', () => {
    expect(getModelDefinition('gpt-4o')!.model).toBe('gpt-4o');
    expect(getModelDefinition('gpt-4o-mini')!.model).toBe('gpt-4o-mini');
    expect(getModelDefinition('gpt-4.1')!.model).toBe('gpt-4.1');
  });

  it('returns the expected models for common Claude full model names', () => {
    expect(getModelDefinition('anthropic.claude-3-opus-20240229-v1:0')!.model).toBe(
      'claude-3-opus'
    );
    expect(getModelDefinition('anthropic.claude-3-5-sonnet-20241022-v2:0')!.model).toBe(
      'claude-3.5-sonnet'
    );
    expect(getModelDefinition('us.anthropic.claude-3-7-sonnet-20250219-v1:0')!.model).toBe(
      'claude-3.7-sonnet'
    );
    expect(getModelDefinition('us.anthropic.claude-4-sonnet-20250219-v1:0')!.model).toBe(
      'claude-4-sonnet'
    );
  });

  it('returns the expected models for common google full model names', () => {
    expect(getModelDefinition('gemini-1.5-pro-preview-0409')!.model).toBe('gemini-1.5-pro');
    expect(getModelDefinition('gemini-2.0-flash-001')!.model).toBe('gemini-2.0-flash');
    expect(getModelDefinition('gemini-2.5-pro-001')!.model).toBe('gemini-2.5-pro');
  });
});
