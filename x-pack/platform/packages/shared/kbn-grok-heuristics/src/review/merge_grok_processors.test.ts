/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeGrokProcessors } from './merge_grok_processors';
import type { GrokProcessorResult } from './get_grok_processor';

describe('mergeGrokProcessors', () => {
  it('handles single processor input', () => {
    const processors: GrokProcessorResult[] = [
      { description: 'Test Log', patterns: ['%{WORD:field_1}'], pattern_definitions: {} },
    ];
    const result = mergeGrokProcessors(processors);
    expect(result).toEqual(processors[0]);
  });

  it('handles conflicting pattern definitions across processors', () => {
    const processors: GrokProcessorResult[] = [
      {
        description: 'Log A',
        patterns: ['%{WORD:field_1}'],
        pattern_definitions: { CUSTOM_PATTERN: '%{WORD}' },
      },
      {
        description: 'Log B',
        patterns: ['%{INT:field_2}'],
        pattern_definitions: { CUSTOM_PATTERN: '%{INT}' },
      },
    ];
    const result = mergeGrokProcessors(processors);
    expect(result.pattern_definitions).toEqual({
      CUSTOM_PATTERN: '%{WORD}',
      CUSTOM_PATTERN2: '%{INT}',
    });
  });
});
