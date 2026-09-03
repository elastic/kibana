/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type { SignalPatternGroup } from '../../common/http_api/feedback_context';
import type { Improvement } from '../../common/http_api/improvements';
import { renderBriefing } from './briefing';

const AI_INDEX = {
  id: 'orders',
  description: 'Everything about orders.',
  dest: { type: 'index', value: 'ai-index-idx-orders' },
  sources: [{ type: 'esql', value: 'FROM logs-orders' }],
  automations: [{ type: 'workflow', value: 'wf-orders' }],
} as unknown as AiIndexHttpItem;

const RUN = {
  signal_window: { from: '2026-08-25T12:00:00.000Z', to: '2026-09-01T12:00:00.000Z' },
  signal_spaces: ['default'],
  signal_count: 12,
};

const KI_SUMMARY = { total: 42, counts_by_type: [{ type: 'document', count: 42 }] };

const GROUP: SignalPatternGroup = {
  tag: 'coverage_gap',
  target_index: 'logs-orders',
  tool: 'execute_esql',
  count: 6,
  score: 18,
  signal_ids: ['trace-1:span-1', 'trace-2:span-4'],
  example: { query: 'FROM logs-orders | LIMIT 10', row_count: 10 },
};

const render = (overrides: Partial<Parameters<typeof renderBriefing>[0]> = {}) =>
  renderBriefing({
    aiIndex: AI_INDEX,
    run: RUN,
    groups: [GROUP],
    kiSummary: KI_SUMMARY,
    history: [],
    allowedActions: ['add_ki', 'edit_ki'],
    ...overrides,
  });

describe('renderBriefing', () => {
  it('describes the index the run is analyzing', () => {
    const briefing = render();

    expect(briefing).toContain('`orders`');
    expect(briefing).toContain('`ai-index-idx-orders`');
    expect(briefing).toContain('Everything about orders.');
    expect(briefing).toContain('`document` × 42');
    expect(briefing).toContain('`FROM logs-orders` (esql)');
  });

  it('states the window and reach of the evidence, so the run knows what it did not see', () => {
    expect(render()).toContain(
      '12 signal(s) from 1 space(s) between 2026-08-25T12:00:00.000Z and 2026-09-01T12:00:00.000Z'
    );
  });

  it('lists the signal ids behind each group, so a proposal can cite them', () => {
    expect(render()).toContain('Signal ids: `trace-1:span-1`, `trace-2:span-4`');
  });

  it('quotes the example query and its row count', () => {
    const briefing = render();

    expect(briefing).toContain('FROM logs-orders | LIMIT 10');
    expect(briefing).toContain('Rows returned by the example: 10');
  });

  it('shows the error instead of the row count when the example failed', () => {
    const briefing = render({
      groups: [
        {
          ...GROUP,
          tag: 'query_error',
          example: { ...GROUP.example, error: 'Unknown column [total]', row_count: 0 },
        },
      ],
    });

    expect(briefing).toContain('Example error: `Unknown column [total]`');
    expect(briefing).not.toContain('Rows returned by the example');
  });

  it('truncates an example long enough to crowd out the rest of the briefing', () => {
    const briefing = render({
      groups: [{ ...GROUP, example: { query: 'x'.repeat(2000), row_count: 0 } }],
    });

    expect(briefing).toContain('…');
    expect(briefing).not.toContain('x'.repeat(600));
  });

  it('says plainly when the signals show nothing wrong', () => {
    expect(render({ groups: [] })).toContain('None of the selected signals were classified');
  });

  it('names the permitted actions and only those', () => {
    const briefing = render();

    expect(briefing).toContain('`add_ki`, `edit_ki`');
    expect(briefing).not.toContain('`remove_ki`');
  });

  it('tells an observe-only run not to propose anything', () => {
    const briefing = render({ allowedActions: [] });

    expect(briefing).toContain('observation only');
    expect(briefing).not.toContain('Propose, do not apply');
  });

  it('tells the run nobody is available to answer questions', () => {
    expect(render()).toContain('Nobody is watching');
  });

  it('lists prior proposals with their outcome so they are not raised again', () => {
    const briefing = render({
      history: [
        {
          improvement_id: 'imp-1',
          action: 'add_ki',
          title: 'Add a KI for refunds',
          status: 'rejected',
          resolution: { reason: 'Refunds are out of scope for this index.' },
        } as unknown as Improvement,
      ],
    });

    expect(briefing).toContain('**rejected** — `add_ki`: Add a KI for refunds');
    expect(briefing).toContain('Refunds are out of scope for this index.');
    expect(briefing).toContain('Do not propose any of these again');
  });

  it('summarises the tail when the history is long', () => {
    const history = Array.from(
      { length: 45 },
      (_, index) =>
        ({
          improvement_id: `imp-${index}`,
          action: 'add_ki',
          title: `Proposal ${index}`,
          status: 'suggested',
        } as unknown as Improvement)
    );

    expect(render({ history })).toContain('…and 5 more.');
  });

  it('says so when there is no history yet', () => {
    expect(render()).toContain('Nothing has been proposed for this index yet.');
  });
});
