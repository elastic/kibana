/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '@kbn/streamlang';
import { pipelineDefinitionSchema, postParsePipelineDefinitionSchema } from './schema';

describe('postParsePipelineDefinitionSchema', () => {
  it('accepts post-parse processors only', () => {
    const parsed = postParsePipelineDefinitionSchema.safeParse({
      steps: [
        {
          action: 'date',
          from: '@timestamp',
          formats: ['ISO8601'],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects grok steps', () => {
    const grok: GrokProcessor = {
      action: 'grok',
      from: 'message',
      patterns: ['%{WORD:x}'],
    };
    const parsed = postParsePipelineDefinitionSchema.safeParse({ steps: [grok] });
    expect(parsed.success).toBe(false);
  });

  it('full schema still allows grok', () => {
    const grok: GrokProcessor = {
      action: 'grok',
      from: 'message',
      patterns: ['%{WORD:x}'],
    };
    const parsed = pipelineDefinitionSchema.safeParse({ steps: [grok] });
    expect(parsed.success).toBe(true);
  });
});
