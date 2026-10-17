/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSandboxPath } from './sandbox_paths';

describe('resolveSandboxPath', () => {
  it.each([
    ['/workspace/a.txt', '/workspace/a.txt'],
    ['/workspace', '/workspace'],
    ['/workspace/dir/', '/workspace/dir'],
    ['a/b.txt', '/workspace/a/b.txt'],
    ['./a.txt', '/workspace/a.txt'],
    ['/tmp/x', '/tmp/x'],
    ['/home/appuser/.venv', '/home/appuser/.venv'],
    ['  /workspace/trimmed  ', '/workspace/trimmed'],
  ])('resolves %s to %s', (input, expected) => {
    expect(resolveSandboxPath(input)).toBe(expected);
  });

  it.each(['', '   ', '.', '/etc/passwd', '/workspace/../etc', '../x', '/workspacex/a', '/'])(
    'rejects %p',
    (input) => {
      expect(resolveSandboxPath(input)).toBeUndefined();
    }
  );
});
