/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Improvement } from '../../common/http_api/improvements';
import { reconcileImprovements } from './reconcile';

const improvement = (overrides: Partial<Improvement> = {}): Improvement =>
  ({
    improvement_id: 'abc',
    ai_index_id: 'orders',
    action: 'add_ki',
    status: 'suggested',
    payload: {},
    ...overrides,
  } as Improvement);

describe('reconcileImprovements', () => {
  const logger = { warn: jest.fn() };
  const context = { spaceId: 'default', request: {} as never };
  let service: { transition: jest.Mock };
  let provider: { create: jest.Mock; getOutcome: jest.Mock };

  const run = (improvements: Improvement[]) =>
    reconcileImprovements({
      improvements,
      improvementsService: service as never,
      proposals: provider as never,
      context,
      logger: logger as never,
    });

  beforeEach(() => {
    service = {
      transition: jest.fn(async (id, status) => improvement({ improvement_id: id, status })),
    };
    provider = { create: jest.fn(), getOutcome: jest.fn() };
  });

  it('asks about the proposal derived from the improvement', async () => {
    provider.getOutcome.mockResolvedValue({ state: 'open' });

    await run([improvement()]);

    expect(provider.getOutcome).toHaveBeenCalledWith({
      ...context,
      proposalId: 'context-engine-abc',
    });
    expect(service.transition).not.toHaveBeenCalled();
  });

  it('records an approval with the KI the add created', async () => {
    provider.getOutcome.mockResolvedValue({ state: 'applied', by: 'ana' });

    const [result] = await run([improvement()]);

    expect(service.transition).toHaveBeenCalledWith('abc', 'applied', {
      by: 'ana',
      applied_target_id: 'improvement-abc',
    });
    expect(result.status).toBe('applied');
  });

  it('records the KI an edit changed as its target', async () => {
    provider.getOutcome.mockResolvedValue({ state: 'applied' });

    await run([improvement({ action: 'edit_ki', target: { ki_id: 'ki-1' } })]);

    expect(service.transition).toHaveBeenCalledWith('abc', 'applied', {
      applied_target_id: 'ki-1',
    });
  });

  it('records a dismissal with its reason, which later runs read', async () => {
    provider.getOutcome.mockResolvedValue({ state: 'rejected', by: 'ana', reason: 'duplicate' });

    await run([improvement()]);

    expect(service.transition).toHaveBeenCalledWith('abc', 'rejected', {
      by: 'ana',
      reason: 'duplicate',
    });
  });

  it('records a failed action once, not on every read', async () => {
    provider.getOutcome.mockResolvedValue({ state: 'failed', error: 'no privilege' });

    await run([improvement()]);
    await run([improvement({ status: 'failed' })]);

    expect(service.transition).toHaveBeenCalledTimes(1);
    expect(service.transition).toHaveBeenCalledWith('abc', 'failed', { error: 'no privilege' });
  });

  it('leaves alone what is decided, has no proposal, or is not proposable', async () => {
    provider.getOutcome.mockResolvedValue(null);

    const items = [
      improvement({ improvement_id: 'a', status: 'applied' }),
      improvement({ improvement_id: 'b', action: 'add_workflow' }),
      improvement({ improvement_id: 'c' }),
    ];
    const result = await run(items);

    expect(provider.getOutcome).toHaveBeenCalledTimes(1);
    expect(result).toEqual(items);
  });

  it('keeps the improvement as it was when reconciling it fails', async () => {
    provider.getOutcome.mockRejectedValue(new Error('boom'));

    const items = [improvement()];
    await expect(run(items)).resolves.toEqual(items);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
