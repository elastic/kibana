/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPROVEMENTS_PER_RUN } from '../constants';
import type { AiIndexHttpItem } from '../http_api/ai_indices';
import type { ImprovementEnvelope } from '../http_api/improvements';
import type { FeedbackPromptInput } from './prompt';
import { buildFeedbackLoopPrompt } from './prompt';

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  managed: false,
  date_created: '2026-07-01T00:00:00.000Z',
  date_modified: '2026-07-01T00:00:00.000Z',
  description: 'Customer support knowledge',
  dest: { type: 'data_stream', value: 'ai-index-ds-support' },
  sources: [{ type: 'esql', value: 'FROM tickets' }],
  automations: [{ type: 'workflow', value: 'refresh-support-kis' }],
};

const buildInput = (overrides: Partial<FeedbackPromptInput> = {}): FeedbackPromptInput => ({
  ai_index: aiIndex,
  ki_summary: { count: 12, counts_by_type: [{ type: 'faq', count: 12 }] },
  signal_groups: [{ tag: 'empty_retrieval', count: 6 }],
  improvements: [],
  signals_index: 'context-engine-signals-default',
  agent_id: 'platform.context_engine.feedback_loop',
  ...overrides,
});

describe('buildFeedbackLoopPrompt', () => {
  it('states the AI index configuration the agent is analyzing', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    expect(prompt).toContain('AI index `support`');
    expect(prompt).toContain('Customer support knowledge');
    expect(prompt).toContain('data_stream `ai-index-ds-support`');
    expect(prompt).toContain('esql: FROM tickets');
    expect(prompt).toContain('workflow: refresh-support-kis');
  });

  it('marks a managed index as unconfigurable so the agent does not propose config edits', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput({ ai_index: { ...aiIndex, managed: true } }));

    expect(prompt).toContain('managed');
    expect(prompt).toContain('cannot be edited');
  });

  it('reports the KI totals and the per-type breakdown', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    expect(prompt).toContain('total: 12');
    expect(prompt).toContain('faq: 12');
  });

  it('names the signals index and shows how to drill into a tag with ES|QL', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    expect(prompt).toContain('context-engine-signals-default');
    expect(prompt).toContain('FROM context-engine-signals-default | WHERE tags == "<tag>"');
    expect(prompt).toContain('empty_retrieval: 6');
  });

  it('renders `none` rather than an empty section when there is nothing to list', () => {
    const prompt = buildFeedbackLoopPrompt(
      buildInput({
        ai_index: { ...aiIndex, description: undefined, sources: [], automations: [] },
        signal_groups: [],
        ki_summary: { count: 0, counts_by_type: [] },
      })
    );

    expect(prompt).toContain('description: none');
    expect(prompt).toContain('- none');
    expect(prompt).not.toMatch(/\n\n\n/);
  });

  it('lists every prior suggestion with its outcome and forbids repeating it', () => {
    const improvements: ImprovementEnvelope[] = [
      {
        improvement_id: 'imp-1',
        ai_index_id: 'support',
        status: 'rejected',
        action: 'add_ki',
        title: 'Add a refund policy KI',
        rationale: 'Refund questions returned no rows.',
        payload: {},
        suggested_at: '2026-08-01T00:00:00.000Z',
        rejected_at: '2026-08-02T00:00:00.000Z',
      },
      {
        improvement_id: 'imp-2',
        ai_index_id: 'support',
        status: 'failed',
        action: 'edit_workflow',
        title: 'Fix the nightly refresh',
        rationale: 'The refresh has not run in a week.',
        payload: {},
        target: { workflow_id: 'refresh-support-kis' },
        suggested_at: '2026-08-03T00:00:00.000Z',
        resolution: { error: 'invalid workflow yaml' },
      },
    ];

    const prompt = buildFeedbackLoopPrompt(buildInput({ improvements }));

    expect(prompt).toContain('[rejected] add_ki: Add a refund policy KI');
    expect(prompt).toContain('resolved 2026-08-02T00:00:00.000Z');
    expect(prompt).toContain('[failed] edit_workflow: Fix the nightly refresh');
    expect(prompt).toContain('(target: refresh-support-kis)');
    expect(prompt).toContain('error: invalid workflow yaml');
    expect(prompt).toContain('Do not repeat anything already `applied`');
  });

  it('does not replay a prior suggestion\u2019s payload, so history stays bounded', () => {
    const prompt = buildFeedbackLoopPrompt(
      buildInput({
        improvements: [
          {
            improvement_id: 'imp-1',
            ai_index_id: 'support',
            status: 'applied',
            action: 'add_ki',
            title: 'Add a refund policy KI',
            rationale: 'Refund questions returned no rows.',
            payload: { ki: { content: 'SECRET-LONG-BODY' } },
            suggested_at: '2026-08-01T00:00:00.000Z',
            applied_at: '2026-08-02T00:00:00.000Z',
          },
        ],
      })
    );

    expect(prompt).not.toContain('SECRET-LONG-BODY');
  });

  it('forbids asking questions, so a scheduled run cannot stall waiting for a user', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    expect(prompt).toContain('Never ask the user a question');
    expect(prompt).toContain('nobody is watching this run');
  });

  it('documents every action, its required fields, and that removals are soft', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    for (const action of [
      'add_ki',
      'edit_ki',
      'remove_ki',
      'add_workflow',
      'edit_workflow',
      'remove_workflow',
    ]) {
      expect(prompt).toContain(`\`${action}\``);
    }
    expect(prompt).toContain('target_ki_id');
    expect(prompt).toContain('target_workflow_id');
    expect(prompt).toContain('workflow_yaml');
    expect(prompt).toContain('flagged as deleted, not erased');
    expect(prompt).toContain('disabled and unlinked, not deleted');
  });

  it('caps the number of suggestions at the same limit the record route enforces', () => {
    const prompt = buildFeedbackLoopPrompt(buildInput());

    expect(prompt).toContain(`at most ${MAX_IMPROVEMENTS_PER_RUN} suggestions`);
  });
});
