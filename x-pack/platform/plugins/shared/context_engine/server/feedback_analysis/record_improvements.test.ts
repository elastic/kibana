/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPROVEMENTS_PER_RUN } from '../../common/constants';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import type { ImprovementsServiceApi } from '../improvements/service';
import { recordImprovements } from './record_improvements';

const SIGNAL_WINDOW = { from: '2026-08-25T12:00:00.000Z', to: '2026-09-01T12:00:00.000Z' };

const buildProposal = (overrides: Record<string, unknown> = {}) => ({
  action: 'add_ki',
  title: 'Add a KI for failed logins',
  rationale: 'Agents fell back to raw logs six times.',
  signal_ids: ['trace-1:span-1'],
  target: { subject: 'logs-auth-*' },
  payload: { ki: { type: 'document', title: 'Failed logins' } },
  ...overrides,
});

describe('recordImprovements', () => {
  let improvementsService: jest.Mocked<Pick<ImprovementsServiceApi, 'write'>>;

  const run = (overrides: Partial<Parameters<typeof recordImprovements>[0]> = {}) =>
    recordImprovements({
      aiIndexId: 'orders',
      source: {
        origin: 'analysis',
        agentRunId: 'run-1',
        signalWindow: SIGNAL_WINDOW,
        signalSpaces: ['default'],
      },
      allowedActions: [...IMPROVEMENT_ACTIONS],
      proposals: [buildProposal()],
      improvementsService: improvementsService as unknown as ImprovementsServiceApi,
      ...overrides,
    });

  beforeEach(() => {
    improvementsService = {
      // The store echoes back what it accepted, so the default mock accepts everything.
      write: jest.fn(async (inputs) => inputs.map((input) => ({ ...input } as never))),
    };
  });

  it('records a valid proposal and reports its derived id', async () => {
    const result = await run();

    expect(result.skipped).toEqual([]);
    expect(result.recorded).toEqual([
      {
        improvement_id: expect.any(String),
        action: 'add_ki',
        title: 'Add a KI for failed logins',
      },
    ]);
  });

  it('writes the run provenance so a proposal can be traced back to its evidence', async () => {
    await run({ suggestedAt: '2026-09-01T12:00:00.000Z' });

    expect(improvementsService.write).toHaveBeenCalledWith([
      expect.objectContaining({
        ai_index_id: 'orders',
        status: 'suggested',
        suggested_at: '2026-09-01T12:00:00.000Z',
        provenance: {
          agent_run_id: 'run-1',
          origin: 'analysis',
          signal_ids: ['trace-1:span-1'],
          signal_spaces: ['default'],
          signal_window: SIGNAL_WINDOW,
          signal_count: 1,
        },
      }),
    ]);
  });

  it('derives the improvement id itself rather than taking one from the run', async () => {
    const result = await run({
      proposals: [buildProposal({ improvement_id: 'run-chosen-id' })],
    });

    expect(result.recorded[0].improvement_id).not.toBe('run-chosen-id');
  });

  it('gives the same id to the same change proposed in two different runs', async () => {
    const first = await run();
    const second = await run({
      source: {
        origin: 'analysis',
        agentRunId: 'run-2',
        signalWindow: SIGNAL_WINDOW,
        signalSpaces: ['default'],
      },
    });

    expect(second.recorded[0].improvement_id).toBe(first.recorded[0].improvement_id);
  });

  it('skips an action the index does not permit and keeps the rest', async () => {
    const result = await run({
      allowedActions: ['add_ki'],
      proposals: [buildProposal(), buildProposal({ action: 'remove_ki', target: { ki_id: 'k1' } })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ action: 'remove_ki', reason: 'action_not_allowed' }),
    ]);
  });

  it('records nothing for an observe-only index', async () => {
    const result = await run({ allowedActions: [] });

    expect(result.recorded).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ reason: 'action_not_allowed' });
    expect(result.skipped[0].detail).toContain('observation only');
    expect(improvementsService.write).toHaveBeenCalledWith([]);
  });

  it('skips a malformed proposal with the reason, rather than failing the batch', async () => {
    const result = await run({
      proposals: [buildProposal({ rationale: undefined }), buildProposal()],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({ reason: 'invalid' });
    expect(result.skipped[0].detail).toContain('rationale');
  });

  it('skips a proposal that names no target the action can be applied to', async () => {
    const result = await run({
      proposals: [buildProposal({ action: 'edit_ki', target: undefined })],
    });

    expect(result.recorded).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ action: 'edit_ki', reason: 'invalid' });
  });

  it('keeps one of two proposals describing the same change', async () => {
    const result = await run({
      proposals: [buildProposal(), buildProposal({ title: 'The same thing, said again' })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ reason: 'duplicate', title: 'The same thing, said again' }),
    ]);
  });

  it('reports the ones the store refused as conflicts, not as recorded', async () => {
    improvementsService.write.mockResolvedValue([]);

    const result = await run();

    expect(result.recorded).toEqual([]);
    expect(result.skipped).toEqual([
      expect.objectContaining({ action: 'add_ki', reason: 'conflict' }),
    ]);
  });

  it('caps how much one run may record', async () => {
    const proposals = Array.from({ length: MAX_IMPROVEMENTS_PER_RUN + 2 }, (_, index) =>
      buildProposal({ title: `Proposal ${index}`, target: { subject: `index-${index}` } })
    );

    const result = await run({ proposals });

    expect(result.recorded).toHaveLength(MAX_IMPROVEMENTS_PER_RUN);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0]).toMatchObject({ reason: 'limit_exceeded' });
  });

  it('spends the cap on what it accepts, not on where a proposal sat in the input', async () => {
    // The first proposals are all rejected, so none of them consume the run's budget: every valid
    // one behind them still fits.
    const result = await run({
      proposals: [
        ...Array.from({ length: MAX_IMPROVEMENTS_PER_RUN }, () => 'not an improvement'),
        buildProposal({ title: 'A good one', target: { subject: 'orders' } }),
      ],
    });

    expect(result.recorded).toEqual([expect.objectContaining({ title: 'A good one' })]);
    expect(result.skipped.every(({ reason }) => reason === 'invalid')).toBe(true);
  });

  it('survives a proposal that is not an object at all', async () => {
    const result = await run({ proposals: ['not an improvement', null] });

    expect(result.recorded).toEqual([]);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.every(({ reason }) => reason === 'invalid')).toBe(true);
  });

  describe('proposed from a conversation', () => {
    const conversation = (overrides: Partial<Parameters<typeof recordImprovements>[0]> = {}) =>
      run({ source: { origin: 'conversation', agentRunId: 'call-1' }, ...overrides });

    it('records a proposal that cites no signals', async () => {
      const { signal_ids: signalIds, ...withoutSignals } = buildProposal();

      const result = await conversation({ proposals: [withoutSignals] });

      expect(result.skipped).toEqual([]);
      expect(result.recorded).toHaveLength(1);
    });

    it('marks provenance as a conversation and records no signal window', async () => {
      const { signal_ids: signalIds, ...withoutSignals } = buildProposal();

      await conversation({ proposals: [withoutSignals] });

      const [[[written]]] = improvementsService.write.mock.calls;
      expect(written.provenance).toEqual({ agent_run_id: 'call-1', origin: 'conversation' });
    });

    it('gives a change the same id however it was proposed', async () => {
      const { signal_ids: signalIds, ...withoutSignals } = buildProposal();

      const fromRun = await run();
      const fromConversation = await conversation({ proposals: [withoutSignals] });

      expect(fromConversation.recorded[0].improvement_id).toBe(fromRun.recorded[0].improvement_id);
    });

    it('still refuses an action the index does not permit', async () => {
      const { signal_ids: signalIds, ...withoutSignals } = buildProposal();

      const result = await conversation({ allowedActions: [], proposals: [withoutSignals] });

      expect(result.recorded).toEqual([]);
      expect(result.skipped[0]).toMatchObject({ reason: 'action_not_allowed' });
    });
  });
});
