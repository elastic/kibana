/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReplayInputsFromExecutionContext } from './build_replay_inputs_from_execution_context';

describe('buildReplayInputsFromExecutionContext', () => {
  it('returns manual inputs and event from execution context', () => {
    expect(
      buildReplayInputsFromExecutionContext({
        inputs: { severity: 'high' },
        event: { type: 'alert' },
        workflow: { id: 'wf-1' },
      })
    ).toEqual({
      severity: 'high',
      event: { type: 'alert' },
    });
  });

  it('returns an empty object when context is missing', () => {
    expect(buildReplayInputsFromExecutionContext(undefined)).toEqual({});
  });

  it('ignores non-object inputs', () => {
    expect(
      buildReplayInputsFromExecutionContext({
        inputs: 'invalid',
        event: { id: 'evt-1' },
      })
    ).toEqual({
      event: { id: 'evt-1' },
    });
  });
});
