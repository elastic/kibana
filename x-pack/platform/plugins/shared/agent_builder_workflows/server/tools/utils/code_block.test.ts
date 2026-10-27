/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatCodeBlock } from './code_block';

describe('formatCodeBlock', () => {
  it('uses a three-backtick fence for plain text', () => {
    expect(formatCodeBlock('yaml', 'a: 1', 100)).toBe('```yaml\na: 1\n```');
  });

  it('uses a fence longer than any backtick run in the text', () => {
    const block = formatCodeBlock('yaml', 'text: |\n  ```\n  injected', 100);
    expect(block.startsWith('````yaml\n')).toBe(true);
    expect(block.endsWith('\n````')).toBe(true);
  });

  it('cuts the text at maxChars', () => {
    expect(formatCodeBlock('json', 'abcdef', 3)).toBe('```json\nabc\n…\n```');
  });
});
