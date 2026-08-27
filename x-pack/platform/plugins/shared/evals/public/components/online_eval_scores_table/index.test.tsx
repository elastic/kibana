/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListOnlineScoresResponse } from '@kbn/evals-common';
import { getOnlineScoreRowId } from '.';

type OnlineScoreRow = ListOnlineScoresResponse['data'][number];

const getRow = (overrides: Partial<OnlineScoreRow> = {}): OnlineScoreRow => ({
  '@timestamp': '2026-08-27T12:00:00.000Z',
  monitor: { id: 'workflow-1', name: 'Quality monitor' },
  trace_id: 'trace-1',
  connector_id: 'connector-1',
  evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
  score: { name: 'factuality', value: 0.9 },
  ...overrides,
});

describe('getOnlineScoreRowId', () => {
  it('distinguishes evaluator versions', () => {
    const firstVersion = getRow();
    const secondVersion = getRow({
      evaluator: { ...firstVersion.evaluator, version: '2.0.0' },
    });

    expect(getOnlineScoreRowId(firstVersion)).not.toBe(getOnlineScoreRowId(secondVersion));
  });

  it('does not collide when identity fields contain separators', () => {
    const firstRow = getRow({ trace_id: 'trace-1' });
    const secondRow = getRow({
      trace_id: 'trace',
      evaluator: { ...firstRow.evaluator, name: '1-correctness' },
    });

    expect(getOnlineScoreRowId(firstRow)).not.toBe(getOnlineScoreRowId(secondRow));
  });
});
