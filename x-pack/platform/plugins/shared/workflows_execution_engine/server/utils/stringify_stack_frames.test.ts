/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyStackFrames } from './stringify_stack_frames';

describe('stringifyStackFrames', () => {
  it('formats a single stack frame', () => {
    const frames = [{ stepId: 'step1', nestedScopes: [{ nodeId: 'node1', scopeId: 'scope1' }] }];
    const result = stringifyStackFrames(frames as any);
    expect(result).toContain('step1');
    expect(result).toContain('node1');
  });

  it('joins multiple frames with arrows', () => {
    const frames = [
      { stepId: 'step1', nestedScopes: [{ nodeId: 'node1' }] },
      { stepId: 'step2', nestedScopes: [{ nodeId: 'node2' }] },
    ];
    const result = stringifyStackFrames(frames as any);
    expect(result).toContain('->');
  });

  it('handles empty stack frames', () => {
    expect(stringifyStackFrames([])).toBe('');
  });

  it('handles frames with empty nested scopes', () => {
    const frames = [{ stepId: 'step1', nestedScopes: [] }];
    const result = stringifyStackFrames(frames as any);
    expect(result).toContain('step1');
  });
});
