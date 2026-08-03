/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectProcessor, GrokProcessor } from '@kbn/streamlang';
import { formatUpstreamSeedParsingContextForPromptMarkdown } from './upstream_seed_parsing_prompt';

describe('formatUpstreamSeedParsingContextForPromptMarkdown', () => {
  it('includes grok patterns and optional pattern_definitions', () => {
    const grok: GrokProcessor = {
      action: 'grok',
      from: 'message',
      patterns: ['%{WORD:fst}', 'line\nwith\nbreak'],
      pattern_definitions: { MYWORD: '\\w+' },
    };
    const md = formatUpstreamSeedParsingContextForPromptMarkdown(grok);
    expect(md).toContain('**Processor type:** `grok`');
    expect(md).toContain('**Source field (`from`):** `message`');
    expect(md).toContain('%{WORD:fst}');
    expect(md).toContain('line\nwith\nbreak');
    expect(md).toContain('"MYWORD"');
  });

  it('includes dissect pattern', () => {
    const dissect: DissectProcessor = {
      action: 'dissect',
      from: 'log',
      pattern: '%{a} %{b}',
    };
    const md = formatUpstreamSeedParsingContextForPromptMarkdown(dissect);
    expect(md).toContain('**Processor type:** `dissect`');
    expect(md).toContain('**Source field (`from`):** `log`');
    expect(md).toContain('%{a} %{b}');
  });
});
