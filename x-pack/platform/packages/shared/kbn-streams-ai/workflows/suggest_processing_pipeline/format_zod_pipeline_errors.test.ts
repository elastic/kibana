/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { pipelineDefinitionSchema, postParsePipelineDefinitionSchema } from './schema';
import { formatZodPipelineErrors } from './format_zod_pipeline_errors';

describe('formatZodPipelineErrors', () => {
  it('narrows errors to the date processor schema when action is date', () => {
    const input = {
      steps: [
        {
          action: 'date',
          from: 123,
        },
      ],
    };

    const result = pipelineDefinitionSchema.safeParse(input);
    const formatted = formatZodPipelineErrors(result.error!, input);
    expect(formatted).toMatchSnapshot();
  });

  it('returns separate errors for each invalid step', () => {
    const input = {
      steps: [
        { action: 'date', from: 123 },
        { action: 'remove', from: '' },
      ],
    };

    const result = pipelineDefinitionSchema.safeParse(input);
    const formatted = formatZodPipelineErrors(result.error!, input);
    expect(formatted).toMatchSnapshot();
  });

  it('reports disallowed action when allowedActions excludes it', () => {
    const input = {
      steps: [{ action: 'grok', from: 'message', patterns: ['%{WORD:x}'] }],
    };

    const result = postParsePipelineDefinitionSchema.safeParse(input);
    const postParseActions = new Set(['date', 'remove', 'rename', 'convert']);
    const formatted = formatZodPipelineErrors(result.error!, input, postParseActions);
    expect(formatted).toMatchSnapshot();
  });

  it('reports unknown action when action is not in ACTION_TO_SCHEMA', () => {
    const input = {
      steps: [{ action: 'nonexistent', field: 'x' }],
    };

    const result = pipelineDefinitionSchema.safeParse(input);
    const formatted = formatZodPipelineErrors(result.error!, input);
    expect(formatted).toMatchSnapshot();
  });

  it('falls back to pipeline-level issues when steps cannot be extracted', () => {
    const input = { not_steps: [] };

    const result = pipelineDefinitionSchema.safeParse(input);
    const formatted = formatZodPipelineErrors(result.error!, input);
    expect(formatted).toMatchSnapshot();
  });

  it('returns empty array when pipeline is valid', () => {
    const input = {
      steps: [{ action: 'date', from: '@timestamp', formats: ['ISO8601'] }],
    };

    const result = pipelineDefinitionSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(formatZodPipelineErrors(new z.ZodError([]), input)).toEqual([]);
  });
});
