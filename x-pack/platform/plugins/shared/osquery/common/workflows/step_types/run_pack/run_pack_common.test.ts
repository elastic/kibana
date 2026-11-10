/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputErrorCode, PreDispatchErrorCode } from '../../contract/error_codes';
import {
  RunPackStepId,
  runPackInputSchema,
  runPackOutputSchema,
  runPackStepCommonDefinition,
} from './run_pack_common';

const target = { agent_ids: ['agent-1'] };

describe('runPackInputSchema', () => {
  it('accepts pack with one targeting mode', () => {
    expect(runPackInputSchema.safeParse({ pack: 'abc', ...target }).success).toBe(true);
  });

  it('accepts prebuilt_pack with one targeting mode and the shared options', () => {
    expect(
      runPackInputSchema.safeParse({
        prebuilt_pack: 'forensic-persistence',
        agent_policy_ids: ['policy-1'],
        wait_timeout: '10m',
        max_rows: 50,
      }).success
    ).toBe(true);
  });

  it('rejects both pack and prebuilt_pack', () => {
    const result = runPackInputSchema.safeParse({
      pack: 'abc',
      prebuilt_pack: 'forensic-persistence',
      ...target,
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      'Set exactly one of pack or prebuilt_pack'
    );
  });

  it('rejects neither pack nor prebuilt_pack', () => {
    const result = runPackInputSchema.safeParse({ ...target });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      'Set exactly one of pack or prebuilt_pack'
    );
  });

  it('rejects the old pack_id key', () => {
    expect(runPackInputSchema.safeParse({ pack_id: 'abc', ...target }).success).toBe(false);
  });

  it('rejects empty pack and prebuilt_pack', () => {
    expect(runPackInputSchema.safeParse({ pack: '', ...target }).success).toBe(false);
    expect(runPackInputSchema.safeParse({ prebuilt_pack: '', ...target }).success).toBe(false);
  });

  it('requires exactly one targeting mode', () => {
    expect(runPackInputSchema.safeParse({ pack: 'abc' }).success).toBe(false);
    expect(
      runPackInputSchema.safeParse({
        pack: 'abc',
        agent_ids: ['agent-1'],
        agent_platforms: ['linux'],
      }).success
    ).toBe(false);
  });

  it.each(['query', 'queries', 'alert_ids', 'case_ids', 'saved_query', 'saved_query_id'])(
    'rejects the unknown key %s',
    (key) => {
      expect(runPackInputSchema.safeParse({ pack: 'abc', ...target, [key]: 'x' }).success).toBe(
        false
      );
    }
  );

  it('rejects wait_timeout above 30m and max_rows out of range', () => {
    expect(
      runPackInputSchema.safeParse({ pack: 'abc', ...target, wait_timeout: '31m' }).success
    ).toBe(false);
    expect(runPackInputSchema.safeParse({ pack: 'abc', ...target, max_rows: 0 }).success).toBe(
      false
    );
    expect(runPackInputSchema.safeParse({ pack: 'abc', ...target, max_rows: 10001 }).success).toBe(
      false
    );
  });
});

describe('runPackOutputSchema', () => {
  const query = {
    query_id: 'procs',
    action_id: 'q-1',
    status: 'success',
    agents: { total: 1, responded: 1, pending: 0, failed: 0 },
    rows: [],
    row_count: 0,
    truncated: false,
  };

  it('accepts the documented output', () => {
    expect(
      runPackOutputSchema.safeParse({ status: 'success', action_id: 'a-1', queries: [query] })
        .success
    ).toBe(true);
  });

  it('accepts every output error code, and rejects an unknown one', () => {
    for (const code of Object.values(OutputErrorCode)) {
      expect(
        runPackOutputSchema.safeParse({ status: 'failed', error_code: code, queries: [] }).success
      ).toBe(true);
    }

    expect(
      runPackOutputSchema.safeParse({ status: 'failed', error_code: 'NOPE', queries: [] }).success
    ).toBe(false);
  });

  it('rejects a query without action_id', () => {
    const { action_id: _omitted, ...withoutActionId } = query;

    expect(
      runPackOutputSchema.safeParse({ status: 'success', queries: [withoutActionId] }).success
    ).toBe(false);
  });
});

describe('contract', () => {
  it('declares the pack pre-dispatch codes and keeps RESULTS_UNREADABLE', () => {
    expect(PreDispatchErrorCode.PACK_NOT_FOUND).toBe('PACK_NOT_FOUND');
    expect(PreDispatchErrorCode.PACK_AMBIGUOUS).toBe('PACK_AMBIGUOUS');
    expect(PreDispatchErrorCode.PACK_QUERY_HAS_PLACEHOLDERS).toBe('PACK_QUERY_HAS_PLACEHOLDERS');
    expect(PreDispatchErrorCode.PACK_HAS_NO_ENABLED_QUERIES).toBe('PACK_HAS_NO_ENABLED_QUERIES');
    expect(PreDispatchErrorCode.PREBUILT_PACK_NOT_LOADED).toBe('PREBUILT_PACK_NOT_LOADED');
    expect(PreDispatchErrorCode.PREBUILT_PACK_AMBIGUOUS).toBe('PREBUILT_PACK_AMBIGUOUS');
    expect(OutputErrorCode.RESULTS_UNREADABLE).toBe('RESULTS_UNREADABLE');
  });

  it('has the step id and documents RESULTS_UNREADABLE', () => {
    expect(runPackStepCommonDefinition.id).toBe(RunPackStepId);
    expect(RunPackStepId).toBe('osquery.runPack');
    expect(runPackStepCommonDefinition.documentation?.details).toContain('RESULTS_UNREADABLE');
  });
});
