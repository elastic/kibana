/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FINALIZE_FEATURES_TOOL_ID } from '@kbn/significant-events-plugin/server';
import { getSuccessfulFinalizeFeaturesParams } from './run_feature_identification_agent';

describe('getSuccessfulFinalizeFeaturesParams', () => {
  it('uses the last successfully completed finalization call', () => {
    expect(
      getSuccessfulFinalizeFeaturesParams([
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: {},
          results: [{ type: 'error', data: { message: 'Invalid parameters' } }],
        },
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: { features: [{ id: 'service-a' }] },
          results: [{ type: 'other', data: { finalized: true } }],
        },
      ])
    ).toEqual({ features: [{ id: 'service-a' }] });
  });

  it('rejects malformed output from a successful finalization call', () => {
    expect(() =>
      getSuccessfulFinalizeFeaturesParams([
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: {},
          results: [{ type: 'other', data: { finalized: true } }],
        },
      ])
    ).toThrow('returned invalid finalization output');
  });
});
