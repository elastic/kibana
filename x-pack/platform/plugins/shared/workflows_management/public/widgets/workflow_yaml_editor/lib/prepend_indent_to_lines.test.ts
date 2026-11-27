/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prependIndentToLines } from './prepend_indent_to_lines';

describe('prependIndentToLines', () => {
  it('prepends spaces to each non-empty line', () => {
    expect(prependIndentToLines('a\nb\nc', 2)).toBe('  a\n  b\n  c');
  });

  it('preserves empty lines without adding indent', () => {
    expect(prependIndentToLines('a\n\nb', 4)).toBe('    a\n\n    b');
  });

  it('handles single line', () => {
    expect(prependIndentToLines('hello', 3)).toBe('   hello');
  });

  it('handles zero indent', () => {
    expect(prependIndentToLines('a\nb', 0)).toBe('a\nb');
  });

  it('handles empty string', () => {
    expect(prependIndentToLines('', 2)).toBe('');
  });
});
