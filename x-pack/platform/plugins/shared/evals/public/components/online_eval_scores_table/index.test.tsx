/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ListOnlineScoresResponse } from '@kbn/evals-common';
import { getOnlineScoreRowId, OnlineEvalScoresTable } from '.';

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

describe('OnlineEvalScoresTable', () => {
  it('opens the evaluator trace and labels the evaluated trace separately', () => {
    const onTraceClick = jest.fn();
    render(
      <OnlineEvalScoresTable
        items={[
          getRow({
            evaluator: {
              name: 'correctness',
              version: '1.0.0',
              kind: 'llm',
              trace_id: 'judge-trace-1',
            },
          }),
        ]}
        totalItemCount={1}
        pageIndex={0}
        pageSize={25}
        loading={false}
        onPageChange={jest.fn()}
        onTraceClick={onTraceClick}
      />
    );

    expect(screen.getByText('Evaluated trace')).toBeInTheDocument();
    expect(screen.getByText('Evaluator trace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'judge-trace-1' }));
    expect(onTraceClick).toHaveBeenCalledWith('judge-trace-1');
  });

  it('does not render an evaluator trace link when its trace id is missing', () => {
    render(
      <OnlineEvalScoresTable
        items={[getRow()]}
        totalItemCount={1}
        pageIndex={0}
        pageSize={25}
        loading={false}
        onPageChange={jest.fn()}
        onTraceClick={jest.fn()}
      />
    );

    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
