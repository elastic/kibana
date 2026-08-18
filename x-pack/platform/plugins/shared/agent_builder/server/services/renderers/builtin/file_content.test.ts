/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileContentRendererDefinition } from './file_content';

describe('fileContentRendererDefinition', () => {
  it('registers itself under type "file_content"', () => {
    expect(fileContentRendererDefinition.type).toBe('file_content');
  });

  it('exposes a non-empty agent description that mentions file_path and /workspace/', () => {
    const description = fileContentRendererDefinition.getAgentDescription?.();
    expect(description).toBeTruthy();
    expect(description).toEqual(expect.stringContaining('file_path'));
    expect(description).toEqual(expect.stringContaining('/workspace/'));
  });

  describe('payloadSchema', () => {
    const { payloadSchema } = fileContentRendererDefinition;

    it('accepts a valid /workspace/ path', () => {
      const result = payloadSchema.safeParse({ file_path: '/workspace/notes/plan.md' });
      expect(result.success).toBe(true);
    });

    it('accepts an optional language override', () => {
      const result = payloadSchema.safeParse({
        file_path: '/workspace/x.txt',
        language: 'markdown',
      });
      expect(result.success).toBe(true);
    });

    it('rejects payloads missing file_path', () => {
      const result = payloadSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects paths that are not under /workspace/', () => {
      const result = payloadSchema.safeParse({ file_path: '/etc/passwd' });
      expect(result.success).toBe(false);
    });
  });
});
