/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER } from '@kbn/workflows-extensions/server';
import { resolveWorkflowOrigin } from './action_origin';

describe('resolveWorkflowOrigin', () => {
  const executionId = '123e4567-e89b-42d3-a456-426614174000';

  it.each([
    ['UUID', executionId],
    ['all allowed characters', 'AZaz09._:-'],
    ['single character', 'a'],
    ['256 characters', 'a'.repeat(256)],
  ])('stores a valid %s verbatim', (_, header) => {
    expect(
      resolveWorkflowOrigin({
        isInternalApiRequest: true,
        headers: { [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: header },
      })
    ).toEqual({ type: 'workflow', run_id: header, verified: false });
  });

  it.each<{ name: string; header: string | string[] | undefined }>([
    { name: 'missing', header: undefined },
    { name: 'empty', header: '' },
    { name: 'blank', header: '   ' },
    { name: '257 characters', header: 'a'.repeat(257) },
    { name: 'comma-joined values', header: `${executionId}, ${executionId}` },
    { name: 'embedded whitespace', header: 'execution id' },
    { name: 'slash', header: 'execution/id' },
    { name: 'non-ASCII character', header: 'exécution' },
    { name: 'control character', header: 'execution\tid' },
  ])('ignores a $name header', ({ header }) => {
    expect(
      resolveWorkflowOrigin({
        isInternalApiRequest: true,
        headers: { [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: header },
      })
    ).toBeUndefined();
  });

  it.each<{ name: string; header: string | string[] }>([
    { name: 'leading whitespace', header: ` ${executionId}` },
    { name: 'trailing whitespace', header: `${executionId} ` },
    { name: 'single-value array', header: [executionId] },
    { name: 'repeated array values', header: [executionId, 'other'] },
    { name: 'trailing newline', header: `${executionId}\n` },
  ])('normalizes a $name header like the other event-chain readers', ({ header }) => {
    expect(
      resolveWorkflowOrigin({
        isInternalApiRequest: true,
        headers: { [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: header },
      })
    ).toEqual({ type: 'workflow', run_id: executionId, verified: false });
  });

  it('ignores a valid execution ID on a non-internal request', () => {
    expect(
      resolveWorkflowOrigin({
        isInternalApiRequest: false,
        headers: { [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: executionId },
      })
    ).toBeUndefined();
  });
});
