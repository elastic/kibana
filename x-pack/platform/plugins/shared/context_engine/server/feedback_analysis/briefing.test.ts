/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import type { SignalPatternGroup } from '../../common/http_api/feedback_context';
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
    history: { total: 0, by_status: {} },
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

  it('tells the run to load the analysis skill, whatever the index is configured with', () => {
    expect(render()).toContain('Load the `analyze-and-improve` skill');
    expect(render({ allowedActions: [] })).toContain('Load the `analyze-and-improve` skill');
  });

  it('says how much history there is and where it stands', () => {
    const briefing = render({
      history: { total: 9, by_status: { rejected: 4, suggested: 3, applied: 2 } },
    });

    expect(briefing).toContain(
      '9 proposal(s) for this index — 3 suggested (awaiting review), 2 applied, 4 rejected.'
    );
  });

  it('hands over the query rather than the proposals, which do not fit and mostly do not apply', () => {
    const briefing = render({ history: { total: 400, by_status: { rejected: 400 } } });

    expect(briefing).toContain('FROM context-engine-improvements');
    expect(briefing).toContain('| WHERE ai_index_id == "orders" AND latest == true');
    expect(briefing).toContain('resolution.reason');
    expect(briefing).toContain('platform.core.execute_esql');
  });

  it('names the field that identifies each kind of target, since the query filters on one', () => {
    const briefing = render({ history: { total: 1, by_status: { rejected: 1 } } });

    expect(briefing).toContain('`target.ki_id`');
    expect(briefing).toContain('`target.workflow_id`');
    expect(briefing).toContain('`target.subject`');
  });

  it('tells the run to look its own conclusion up before proposing it', () => {
    expect(render()).toContain('Check the target’s history once you know what you want to change');
  });

  it('says so when there is no history yet, without a query to run against nothing', () => {
    const briefing = render();

    expect(briefing).toContain('Nothing has been proposed for this index yet');
    expect(briefing).not.toContain('FROM context-engine-improvements');
  });
});
