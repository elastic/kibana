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
    history: { total: 0, items: [] },
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

  describe('a run with no signals at all', () => {
    const withoutSignals = () =>
      render({
        groups: [],
        run: { ...RUN, signal_count: 0, signal_spaces: [] },
      });

    it('says what the silence does and does not settle', () => {
      const briefing = withoutSignals();

      expect(briefing).toContain('No signals at all');
      expect(briefing).toContain('not the index itself');
    });

    it('points the run at the index instead of at ids it cannot cite', () => {
      const briefing = withoutSignals();

      expect(briefing).toContain('omit `signal_ids`');
      expect(briefing).toContain('name the evidence in `rationale`');
      expect(briefing).not.toContain('Cite the `signal_ids` you took it from');
    });

    it('keeps asking for grounding, so an empty window is not licence to invent work', () => {
      expect(withoutSignals()).toContain(
        'A proposal you cannot trace to something you actually looked at is one you should not make.'
      );
    });

    it('still requires the signal ids of a run that has them', () => {
      expect(render()).toContain('Cite the `signal_ids` you took it from');
    });
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

  it('lists what was proposed before and what became of each', () => {
    const briefing = render({
      history: {
        total: 3,
        items: [
          {
            id: 'a',
            title: 'Edit the refund KI',
            actionWorkflowId: 'system-context-engine-action-edit-ki',
            actionInput: { ki_id: 'ki-7' },
            status: 'pending',
          },
          {
            id: 'b',
            title: 'Add a returns KI',
            actionWorkflowId: 'system-context-engine-action-add-ki',
            actionInput: { ki_id: 'improvement-b' },
            status: 'succeeded',
          },
          {
            id: 'c',
            title: 'Remove the old KI',
            actionWorkflowId: 'system-context-engine-action-remove-ki',
            actionInput: { ki_id: 'ki-2' },
            status: 'no_action',
            reason: 'duplicate: kept on purpose',
          },
        ],
      },
    });

    expect(briefing).toContain('3 proposal(s) for this index.');
    expect(briefing).toContain('**awaiting review**: Edit the refund KI (edit_ki, ki_id `ki-7`)');
    expect(briefing).toContain('**approved and applied**: Add a returns KI (add_ki)');
    expect(briefing).not.toContain('improvement-b');
    expect(briefing).toContain(
      '**rejected**: Remove the old KI (remove_ki, ki_id `ki-2`) — reviewer: duplicate: kept on purpose'
    );
  });

  it('says how many are not listed when the history is longer than what was read', () => {
    const briefing = render({
      history: {
        total: 400,
        items: [{ id: 'a', title: 'Edit the refund KI', status: 'pending' }],
      },
    });

    expect(briefing).toContain('400 proposal(s) for this index; the 1 most recent are listed.');
  });

  it('warns that proposing a listed change again is refused as a duplicate', () => {
    const briefing = render({
      history: { total: 1, items: [{ id: 'a', title: 'T', status: 'failed', error: 'denied' }] },
    });

    expect(briefing).toContain('refused as a duplicate');
    expect(briefing).toContain('error: denied');
  });

  it('tells the run to check the list before proposing', () => {
    expect(render()).toContain('Check what was proposed before');
  });

  it('says so when there is no history yet, without a list', () => {
    const briefing = render();

    expect(briefing).toContain('Nothing has been proposed for this index yet');
    expect(briefing).not.toContain('context-engine-improvements');
  });
});
