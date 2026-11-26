/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StackFrame } from '@kbn/workflows';
import { buildStepIoContextId } from '../parallel_branch_scope';

describe('buildStepIoContextId', () => {
  it('returns the step id when there is no scope', () => {
    expect(buildStepIoContextId('process', [])).toBe('process');
  });

  it('collapses foreach iterations that differ only by scopeId', () => {
    const iter0: StackFrame[] = [
      {
        stepId: 'loop',
        nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'enter-foreach', scopeId: '0' }],
      },
    ];
    const iter1: StackFrame[] = [
      {
        stepId: 'loop',
        nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'enter-foreach', scopeId: '1' }],
      },
    ];

    expect(buildStepIoContextId('process', iter0)).toBe('process');
    expect(buildStepIoContextId('process', iter1)).toBe('process');
    expect(buildStepIoContextId('process', iter0)).toBe(buildStepIoContextId('process', iter1));
  });

  it('includes parallel branch lineage so sibling branches differ', () => {
    const branch0: StackFrame[] = [
      {
        stepId: 'fanOut',
        nestedScopes: [{ nodeId: 'parallel_1', nodeType: 'enter-parallel', scopeId: '0' }],
      },
    ];
    const branch1: StackFrame[] = [
      {
        stepId: 'fanOut',
        nestedScopes: [{ nodeId: 'parallel_1', nodeType: 'enter-parallel', scopeId: '1' }],
      },
    ];

    expect(buildStepIoContextId('process', branch0)).toBe('process|fanOut=parallel_1|branch=0');
    expect(buildStepIoContextId('process', branch1)).toBe('process|fanOut=parallel_1|branch=1');
  });

  it('does not embed foreach scopeId in the parallel fanOut path', () => {
    const iter0Branch0: StackFrame[] = [
      {
        stepId: 'loop',
        nestedScopes: [
          { nodeId: 'enterForeach', nodeType: 'enter-foreach', scopeId: '0' },
          { nodeId: 'parallel_1', nodeType: 'enter-parallel', scopeId: '0' },
        ],
      },
    ];
    const iter1Branch0: StackFrame[] = [
      {
        stepId: 'loop',
        nestedScopes: [
          { nodeId: 'enterForeach', nodeType: 'enter-foreach', scopeId: '1' },
          { nodeId: 'parallel_1', nodeType: 'enter-parallel', scopeId: '0' },
        ],
      },
    ];

    expect(buildStepIoContextId('process', iter0Branch0)).toBe(
      'process|fanOut=enterForeach/parallel_1|branch=0'
    );
    expect(buildStepIoContextId('process', iter0Branch0)).toBe(
      buildStepIoContextId('process', iter1Branch0)
    );
  });
});
