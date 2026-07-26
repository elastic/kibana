/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor, StreamlangDSL } from '@kbn/streamlang';
import { mergeSeedParsingProcessorIntoSuggestedPipeline } from './merge_seed_parsing_into_suggested_pipeline';

describe('mergeSeedParsingProcessorIntoSuggestedPipeline', () => {
  const seedGrok: GrokProcessor = {
    action: 'grok',
    from: 'message',
    patterns: ['%{WORD:extracted}'],
  };

  it('prepends seed parsing, strips prior identifiers, and renumbers', () => {
    const agentPipeline: StreamlangDSL = {
      steps: [
        {
          action: 'date',
          from: '@timestamp',
          formats: ['ISO8601'],
          customIdentifier: '0',
        },
      ],
    };

    const merged = mergeSeedParsingProcessorIntoSuggestedPipeline(
      { ...seedGrok, customIdentifier: 'seed' },
      agentPipeline
    );

    expect(merged.steps.length).toBe(2);
    expect(merged.steps[0]).toMatchObject({
      action: 'grok',
      from: 'message',
      patterns: ['%{WORD:extracted}'],
      customIdentifier: 'root.steps[0]',
    });
    expect(merged.steps[1]).toMatchObject({
      action: 'date',
      customIdentifier: 'root.steps[1]',
    });
  });
});
