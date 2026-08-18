/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWorkspaceFilePath } from './workspace_path';

describe('resolveWorkspaceFilePath', () => {
  it('accepts and normalizes an in-workspace path', () => {
    expect(resolveWorkspaceFilePath('/workspace/renders/table/x.json')).toBe(
      '/workspace/renders/table/x.json'
    );
    expect(resolveWorkspaceFilePath('/workspace/./renders/x.json')).toBe(
      '/workspace/renders/x.json'
    );
  });

  it('rejects an absolute path outside /workspace', () => {
    expect(() => resolveWorkspaceFilePath('/etc/passwd')).toThrow('within /workspace');
  });

  it('rejects traversal that escapes /workspace', () => {
    expect(() => resolveWorkspaceFilePath('/workspace/../etc/passwd')).toThrow('within /workspace');
    expect(() => resolveWorkspaceFilePath('/workspace/../../etc')).toThrow('within /workspace');
  });

  it('rejects a relative path', () => {
    expect(() => resolveWorkspaceFilePath('renders/x.json')).toThrow('within /workspace');
  });

  it('rejects the bare workspace root (no file)', () => {
    expect(() => resolveWorkspaceFilePath('/workspace')).toThrow('within /workspace');
  });
});
